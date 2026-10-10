async function getGoogleAccessToken() {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
  const refreshToken = Deno.env.get("GOOGLE_REFRESH_TOKEN");
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Missing Google OAuth secrets");
  }
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token"
    })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Token refresh failed: ${response.status} ${JSON.stringify(data)}`);
  }
  return data.access_token;
}
Deno.serve(async (req)=>{
  const cronSecret = Deno.env.get("RENEW_GMAIL_WATCH_SECRET");
  if (!cronSecret) {
    return Response.json({
      ok: false,
      error: "Internal server error"
    }, {
      status: 500
    });
  }
  if (req.headers.get("X-Cron-Secret") !== cronSecret) {
    return Response.json({
      ok: false,
      error: "Unauthorized"
    }, {
      status: 401
    });
  }
  try {
    const accessToken = await getGoogleAccessToken();
    const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/watch", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        topicName: "projects/gastos-dashboard-500514/topics/gmail-bank-transactions",
        labelIds: [
          "Label_26855318194589338",
          "Label_5909924738869112246"
        ],
        labelFilterBehavior: "INCLUDE"
      })
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(`Gmail watch failed: ${response.status} ${JSON.stringify(data)}`);
    }
    console.log("Gmail watch renewed:", JSON.stringify(data));
    return Response.json({
      ok: true,
      watch: data
    });
  } catch (err) {
    console.error("renew-gmail-watch error:", err);
    return Response.json({
      ok: false,
      error: String(err)
    }, {
      status: 500
    });
  }
});
