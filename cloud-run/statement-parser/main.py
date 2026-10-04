import os
import re
import hashlib
import tempfile
import subprocess

import requests

from fastapi import (
    FastAPI,
    UploadFile,
    File,
    Form,
    HTTPException,
)

app = FastAPI()


SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv(
    "SUPABASE_SERVICE_ROLE_KEY"
)


ROW_RE = re.compile(
    r"^(?P<location>.*?)\s*"
    r"(?P<date>\d{2}/\d{2}/\d{2})\s+"
    r"(?P<reference>\d{12})\s+"
    r"(?P<rest>.+)$"
)

AMOUNT_RE = re.compile(
    r"\$\s*(-?[\d\.]+)"
)

INSTALLMENT_RE = re.compile(
    r"\b(\d{2})/(\d{2})\b"
)


# ------------------------------------------------------------
# Parsing
# ------------------------------------------------------------

def parse_clp(value: str) -> int:
    return int(
        value
        .replace(".", "")
        .replace(" ", "")
    )


def parse_statement_text(text: str):
    rows = []

    for original_line in text.splitlines():
        line = original_line.strip()

        if not line:
            continue

        match = ROW_RE.match(line)

        if not match:
            continue

        rest = match.group("rest")

        if "$" not in rest:
            continue

        description = (
            rest.split("$", 1)[0].strip()
        )

        amounts = AMOUNT_RE.findall(rest)

        if not amounts:
            continue

        amount = parse_clp(
            amounts[0]
        )

        total_amount = (
            parse_clp(amounts[1])
            if len(amounts) >= 2
            else None
        )

        installment_amount = (
            parse_clp(amounts[2])
            if len(amounts) >= 3
            else None
        )

        installment_match = (
            INSTALLMENT_RE.search(rest)
        )

        installment_number = None
        installment_count = None

        if installment_match:
            installment_number = int(
                installment_match.group(1)
            )

            installment_count = int(
                installment_match.group(2)
            )

        day, month, year = (
            match
            .group("date")
            .split("/")
        )

        operation_date = (
            f"20{year}-{month}-{day}"
        )

        rows.append({
            "location":
                match
                .group("location")
                .strip()
                or None,

            "operation_date":
                operation_date,

            "reference_code":
                match.group("reference"),

            "description":
                description,

            "amount":
                amount,

            "total_amount":
                total_amount,

            "installment_number":
                installment_number,

            "installment_count":
                installment_count,

            "installment_amount":
                installment_amount,

            "currency":
                "CLP",

            "raw_line":
                original_line,
        })

    return rows


# ------------------------------------------------------------
# PDF extraction
# ------------------------------------------------------------

def extract_pdf_text(
    pdf_bytes: bytes,
    password: str,
) -> str:
    with tempfile.TemporaryDirectory() as tmp:

        input_path = os.path.join(
            tmp,
            "statement.pdf"
        )

        output_path = os.path.join(
            tmp,
            "statement.txt"
        )

        with open(
            input_path,
            "wb",
        ) as f:
            f.write(pdf_bytes)

        process = subprocess.run(
            [
                "pdftotext",
                "-upw",
                password,
                "-layout",
                input_path,
                output_path,
            ],
            capture_output=True,
            text=True,
        )

        if process.returncode != 0:
            raise ValueError(
                "Could not decrypt/read PDF: "
                + process.stderr
            )

        with open(
            output_path,
            "r",
            encoding="utf-8",
            errors="replace",
        ) as f:
            return f.read()


# ------------------------------------------------------------
# statement_id
# ------------------------------------------------------------

def generate_statement_id(
    pdf_bytes: bytes
) -> str:
    """
    Stable ID based on the PDF itself.

    Uploading the exact same PDF again
    produces the same statement_id.
    """

    digest = hashlib.sha256(
        pdf_bytes
    ).hexdigest()

    return digest[:24]


# ------------------------------------------------------------
# Supabase
# ------------------------------------------------------------

def save_rows_to_supabase(
    statement_id: str,
    rows: list[dict],
):
    if (
        not SUPABASE_URL
        or not SUPABASE_SERVICE_ROLE_KEY
    ):
        raise RuntimeError(
            "Supabase environment variables "
            "are not configured"
        )

    payload = []

    for row in rows:
        payload.append({
            **row,

            "statement_id":
                statement_id,

            "reconciliation_status":
                "pending",
        })

    if not payload:
        return

    url = (
        f"{SUPABASE_URL}"
        "/rest/v1/"
        "bank_statement_transactions"
        "?on_conflict="
        "statement_id,"
        "reference_code,"
        "operation_date,"
        "amount"
    )

    response = requests.post(
        url,
        headers={
            "apikey":
                SUPABASE_SERVICE_ROLE_KEY,

            "Authorization":
                (
                    "Bearer "
                    + SUPABASE_SERVICE_ROLE_KEY
                ),

            "Content-Type":
                "application/json",

            "Prefer":
                (
                    "resolution=ignore-duplicates,"
                    "return=minimal"
                ),
        },
        json=payload,
        timeout=60,
    )

    if not response.ok:
        raise RuntimeError(
            "Supabase insert failed: "
            f"{response.status_code} "
            f"{response.text}"
        )


# ------------------------------------------------------------
# Endpoints
# ------------------------------------------------------------

@app.get("/health")
def health():
    return {
        "ok": True,
        "supabase_configured": bool(
            SUPABASE_URL
            and SUPABASE_SERVICE_ROLE_KEY
        ),
    }


@app.post("/parse")
async def parse_statement(
    file: UploadFile = File(...),
    password: str = Form(...),
):
    if not file.filename.lower().endswith(
        ".pdf"
    ):
        raise HTTPException(
            status_code=400,
            detail="Expected a PDF",
        )

    pdf_bytes = await file.read()

    try:
        text = extract_pdf_text(
            pdf_bytes,
            password,
        )

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )

    rows = parse_statement_text(
        text
    )

    return {
        "ok": True,

        "filename":
            file.filename,

        "statement_id":
            generate_statement_id(
                pdf_bytes
            ),

        "rows_found":
            len(rows),

        "rows":
            rows,
    }


@app.post("/parse-and-save")
async def parse_and_save_statement(
    file: UploadFile = File(...),
    password: str = Form(...),
):
    if not file.filename.lower().endswith(
        ".pdf"
    ):
        raise HTTPException(
            status_code=400,
            detail="Expected a PDF",
        )

    pdf_bytes = await file.read()

    try:
        text = extract_pdf_text(
            pdf_bytes,
            password,
        )

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )

    rows = parse_statement_text(
        text
    )

    statement_id = (
        generate_statement_id(
            pdf_bytes
        )
    )

    try:
        save_rows_to_supabase(
            statement_id,
            rows,
        )

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error),
        )

    return {
        "ok": True,

        "filename":
            file.filename,

        "statement_id":
            statement_id,

        "rows_found":
            len(rows),

        "rows_saved":
            len(rows),
    }
