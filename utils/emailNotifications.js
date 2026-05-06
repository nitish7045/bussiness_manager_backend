// utils/emailNotifications.js
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Get user's location info from IP
const getLocationInfo = async (ip) => {
  try {
    // Using free IP API (you can use paid services for better accuracy)
    const response = await fetch(`http://ip-api.com/json/${ip}`);
    const data = await response.json();
    
    if (data.status === "success") {
      return {
        country: data.country,
        city: data.city,
        region: data.regionName,
        lat: data.lat,
        lon: data.lon,
        isp: data.isp,
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching location:", error);
    return null;
  }
};

// Get device info from user-agent
const getDeviceInfo = (userAgent) => {
  const deviceInfo = {
    browser: "Unknown",
    os: "Unknown",
    device: "Unknown",
  };

  // Browser detection
  if (userAgent.includes("Chrome")) deviceInfo.browser = "Chrome";
  else if (userAgent.includes("Firefox")) deviceInfo.browser = "Firefox";
  else if (userAgent.includes("Safari")) deviceInfo.browser = "Safari";
  else if (userAgent.includes("Edge")) deviceInfo.browser = "Edge";
  
  // OS detection
  if (userAgent.includes("Windows")) deviceInfo.os = "Windows";
  else if (userAgent.includes("Mac")) deviceInfo.os = "macOS";
  else if (userAgent.includes("Linux")) deviceInfo.os = "Linux";
  else if (userAgent.includes("Android")) deviceInfo.os = "Android";
  else if (userAgent.includes("iOS")) deviceInfo.os = "iOS";
  
  // Device detection
  if (userAgent.includes("Mobile")) deviceInfo.device = "Mobile";
  else if (userAgent.includes("Tablet")) deviceInfo.device = "Tablet";
  else deviceInfo.device = "Desktop";
  
  return deviceInfo;
};

// Send email notification
const sendEmailNotification = async (to, subject, htmlContent) => {
  try {
    await transporter.sendMail({
      from: `"Business Manager Security" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: subject,
      html: htmlContent,
    });
    return true;
  } catch (error) {
    console.error("Email send error:", error);
    return false;
  }
};

// Wrong password attempt notification
const sendWrongPasswordAlert = async (email, attemptCount, ip, userAgent) => {
  const location = await getLocationInfo(ip);
  const device = getDeviceInfo(userAgent);
  const time = new Date().toLocaleString();
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Security Alert - Failed Login Attempt</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="100%" max-width="560" cellpadding="0" cellspacing="0" style="max-width: 560px; width: 100%; background-color: #ffffff; border-radius: 16px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); overflow: hidden;">
              
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 40px 30px; text-align: center;">
                  <div style="background-color: rgba(255, 255, 255, 0.2); border-radius: 50%; width: 80px; height: 80px; margin: 0 auto; display: flex; align-items: center; justify-content: center;">
                    <svg style="width: 40px; height: 40px;" fill="white" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                    </svg>
                  </div>
                  <h1 style="color: #ffffff; font-size: 24px; font-weight: 700; margin: 20px 0 0 0;">⚠️ Security Alert</h1>
                  <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Failed Login Attempt Detected</p>
                </td>
              </tr>

              <!-- Content -->
              <tr>
                <td style="padding: 40px 30px;">
                  <p style="color: #1f2937; font-size: 16px; margin-bottom: 20px;">
                    Hello <strong>${email.split('@')[0]}</strong>,
                  </p>
                  
                  <p style="color: #4b5563; font-size: 15px; line-height: 24px; margin-bottom: 25px;">
                    We detected a <strong style="color: #dc2626;">failed login attempt</strong> on your Business Manager account. This is attempt #${attemptCount} with incorrect password.
                  </p>

                  <!-- Login Details -->
                  <div style="background: #f9fafb; border-radius: 12px; padding: 20px; margin-bottom: 25px; border: 1px solid #e5e7eb;">
                    <h3 style="color: #374151; font-size: 16px; margin: 0 0 15px 0;">📍 Login Details:</h3>
                    <table width="100%" style="font-size: 14px;">
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280;">Time:</td>
                        <td style="padding: 8px 0; color: #1f2937; font-weight: 500;">${time}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280;">IP Address:</td>
                        <td style="padding: 8px 0; color: #1f2937; font-weight: 500;">${ip}</td>
                      </tr>
                      ${location ? `
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280;">Location:</td>
                        <td style="padding: 8px 0; color: #1f2937; font-weight: 500;">${location.city}, ${location.country}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280;">ISP:</td>
                        <td style="padding: 8px 0; color: #1f2937; font-weight: 500;">${location.isp}</td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280;">Device:</td>
                        <td style="padding: 8px 0; color: #1f2937; font-weight: 500;">${device.device}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280;">OS:</td>
                        <td style="padding: 8px 0; color: #1f2937; font-weight: 500;">${device.os}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280;">Browser:</td>
                        <td style="padding: 8px 0; color: #1f2937; font-weight: 500;">${device.browser}</td>
                      </tr>
                    </table>
                  </div>

                  <!-- Warning Note -->
                  <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 25px; border-radius: 8px;">
                    <p style="color: #92400e; font-size: 13px; margin: 0;">
                      <strong>🔒 What to do:</strong> If this wasn't you, please secure your account immediately by changing your password.
                    </p>
                  </div>

                  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">
                  
                  <p style="color: #6b7280; font-size: 13px; text-align: center;">
                      If this was you, you can ignore this message.
                    </p>
                 </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #f9fafb; padding: 20px; text-align: center;">
                  <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                    © 2024 Business Manager. All rights reserved.<br>
                    This is an automated security notification.
                  </p>
                </td>
              </tr>
            ~
            </table>
          ~
        ~
      </table>
    </body>
    </html>
  `;

  return await sendEmailNotification(email, "⚠️ Security Alert: Failed Login Attempt", htmlContent);
};

// Successful login notification (new device/location)
const sendLoginNotification = async (email, ip, userAgent, isNewLocation = false) => {
  const location = await getLocationInfo(ip);
  const device = getDeviceInfo(userAgent);
  const time = new Date().toLocaleString();
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>New Login Detected</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="100%" max-width="560" cellpadding="0" cellspacing="0" style="max-width: 560px; width: 100%; background-color: #ffffff; border-radius: 16px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); overflow: hidden;">
              
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
                  <div style="background-color: rgba(255, 255, 255, 0.2); border-radius: 50%; width: 80px; height: 80px; margin: 0 auto; display: flex; align-items: center; justify-content: center;">
                    <svg style="width: 40px; height: 40px;" fill="white" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                    </svg>
                  </div>
                  <h1 style="color: #ffffff; font-size: 24px; font-weight: 700; margin: 20px 0 0 0;">
                    ${isNewLocation ? "🔐 New Login Detected" : "✅ Successful Login"}
                  </h1>
                  <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">
                    ${isNewLocation ? "We noticed a login from a new device/location" : "You've successfully signed in to your account"}
                  </p>
                </td>
              </tr>

              <!-- Content -->
              <tr>
                <td style="padding: 40px 30px;">
                  <p style="color: #1f2937; font-size: 16px; margin-bottom: 20px;">
                    Hello <strong>${email.split('@')[0]}</strong>,
                  </p>
                  
                  <p style="color: #4b5563; font-size: 15px; line-height: 24px; margin-bottom: 25px;">
                    ${isNewLocation ? 
                      "We detected a sign-in to your account from a new device or location. If this was you, no further action is needed." : 
                      "Your account was successfully accessed. Here are the login details:"}
                  </p>

                  <!-- Login Details -->
                  <div style="background: #f9fafb; border-radius: 12px; padding: 20px; margin-bottom: 25px; border: 1px solid #e5e7eb;">
                    <h3 style="color: #374151; font-size: 16px; margin: 0 0 15px 0;">📍 Login Information:</h3>
                    <table width="100%" style="font-size: 14px;">
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280;">Time:</td>
                        <td style="padding: 8px 0; color: #1f2937; font-weight: 500;">${time}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280;">IP Address:</td>
                        <td style="padding: 8px 0; color: #1f2937; font-weight: 500;">${ip}</td>
                      </tr>
                      ${location ? `
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280;">Location:</td>
                        <td style="padding: 8px 0; color: #1f2937; font-weight: 500;">📍 ${location.city}, ${location.region}, ${location.country}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280;">ISP:</td>
                        <td style="padding: 8px 0; color: #1f2937; font-weight: 500;">${location.isp}</td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280;">Device:</td>
                        <td style="padding: 8px 0; color: #1f2937; font-weight: 500;">${device.device}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280;">Operating System:</td>
                        <td style="padding: 8px 0; color: #1f2937; font-weight: 500;">${device.os}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280;">Browser:</td>
                        <td style="padding: 8px 0; color: #1f2937; font-weight: 500;">${device.browser}</td>
                      </tr>
                    </table>
                  </div>

                  <!-- Action Buttons -->
                  <div style="text-align: center; margin-bottom: 25px;">
                    <a href="${process.env.FRONTEND_URL}/security" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; margin: 0 5px;">
                      View Security Settings
                    </a>
                    <a href="${process.env.FRONTEND_URL}/change-password" style="display: inline-block; background: white; color: #667eea; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; margin: 0 5px; border: 2px solid #667eea;">
                      Change Password
                    </a>
                  </div>

                  <!-- Security Note -->
                  <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; border-radius: 8px;">
                    <p style="color: #1e40af; font-size: 13px; margin: 0;">
                      <strong>💡 Tip:</strong> To better protect your account, consider enabling two-factor authentication (2FA) in your security settings.
                    </p>
                  </div>

                  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">
                  
                  <p style="color: #6b7280; font-size: 13px; text-align: center;">
                    If you didn't perform this login, please <a href="${process.env.FRONTEND_URL}/security" style="color: #dc2626;">secure your account immediately</a>.
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #f9fafb; padding: 20px; text-align: center;">
                  <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                    © 2024 Business Manager. All rights reserved.<br>
                    This is an automated security notification.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return await sendEmailNotification(email, isNewLocation ? "🔐 New Login to Your Account" : "✅ Login Notification", htmlContent);
};

// Excessive failed attempts alert
const sendExcessiveAttemptsAlert = async (email, attemptCount, ip, userAgent) => {
  const location = await getLocationInfo(ip);
  const device = getDeviceInfo(userAgent);
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>🚨 Security Alert: Multiple Failed Attempts</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="100%" max-width="560" cellpadding="0" cellspacing="0" style="max-width: 560px; width: 100%; background-color: #ffffff; border-radius: 16px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); overflow: hidden;">
              
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 40px 30px; text-align: center;">
                  <div style="background-color: rgba(255, 255, 255, 0.2); border-radius: 50%; width: 80px; height: 80px; margin: 0 auto; display: flex; align-items: center; justify-content: center;">
                    <svg style="width: 40px; height: 40px;" fill="white" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                    </svg>
                  </div>
                  <h1 style="color: #ffffff; font-size: 24px; font-weight: 700; margin: 20px 0 0 0;">🚨 Multiple Failed Attempts</h1>
                  <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Your account has been temporarily locked</p>
                </td>
              </tr>

              <!-- Content -->
              <tr>
                <td style="padding: 40px 30px;">
                  <p style="color: #1f2937; font-size: 16px; margin-bottom: 20px;">
                    Hello <strong>${email.split('@')[0]}</strong>,
                  </p>
                  
                  <div style="background: #fee2e2; border-radius: 12px; padding: 20px; margin-bottom: 25px; border: 1px solid #fecaca;">
                    <p style="color: #991b1b; font-size: 15px; margin: 0;">
                      <strong>⚠️ Critical Security Alert</strong><br>
                      Your account has been temporarily locked due to ${attemptCount} failed login attempts within a short period.
                    </p>
                  </div>

                  <p style="color: #4b5563; font-size: 15px; line-height: 24px; margin-bottom: 20px;">
                    This could indicate someone is trying to access your account without authorization.
                  </p>

                  <!-- Attempt Details -->
                  <div style="background: #f9fafb; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
                    <h3 style="color: #374151; font-size: 16px; margin: 0 0 15px 0;">Attempt Details:</h3>
                    <table width="100%" style="font-size: 14px;">
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280;">Total Attempts:</td>
                        <td style="padding: 8px 0; color: #dc2626; font-weight: 700;">${attemptCount}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280;">IP Address:</td>
                        <td style="padding: 8px 0; color: #1f2937; font-weight: 500;">${ip}</td>
                      </tr>
                      ${location ? `
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280;">Location:</td>
                        <td style="padding: 8px 0; color: #1f2937; font-weight: 500;">${location.city}, ${location.country}</td>
                      </tr>
                      ` : ''}
                    </table>
                  </div>

                  <!-- Action Required -->
                  <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 25px; border-radius: 8px;">
                    <p style="color: #92400e; font-size: 13px; margin: 0;">
                      <strong>🔒 Recommended Actions:</strong><br>
                      1. Change your password immediately<br>
                      2. Enable Two-Factor Authentication (2FA)<br>
                      3. Review recent account activity<br>
                      4. Contact support if you didn't attempt these logins
                    </p>
                  </div>

                  <div style="text-align: center;">
                    <a href="${process.env.FRONTEND_URL}/change-password" style="display: inline-block; background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; text-decoration: none; padding: 12px 30px; border-radius: 8px; font-weight: 600;">
                      Secure Your Account Now
                    </a>
                  </div>
                 </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #f9fafb; padding: 20px; text-align: center;">
                  <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                    © 2024 Business Manager. All rights reserved.<br>
                    This is an automated security alert.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return await sendEmailNotification(email, "🚨 Security Alert: Multiple Failed Login Attempts", htmlContent);
};

module.exports = {
  sendWrongPasswordAlert,
  sendLoginNotification,
  sendExcessiveAttemptsAlert,
  getLocationInfo,
  getDeviceInfo,
};