const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const Salary = require("../models/Salary");
const Employee = require("../models/Employee");
const nodemailer = require("nodemailer");

// Configure email transporter (use your email service)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Send salary slip via email
router.post("/send-salary-slip", auth, async (req, res) => {
  try {
    const { email, salaryId } = req.body;
    
    const salary = await Salary.findOne({
      _id: salaryId,
      companyId: req.user.companyId
    }).populate("workerId");
    
    if (!salary) {
      return res.status(404).json({ msg: "Salary record not found" });
    }
    
    // Generate HTML for email
    const htmlContent = generateSalarySlipHTML(salary);
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Salary Slip - ${salary.workerId.name} - ${salary.month}/${salary.year}`,
      html: htmlContent
    };
    
    await transporter.sendMail(mailOptions);
    
    res.json({ msg: "Salary slip sent successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Error sending email" });
  }
});

function generateSalarySlipHTML(salary) {
  const worker = salary.workerId;
  const formatNumber = (num) => num?.toLocaleString('en-IN') || 0;
  const getMonthName = (month) => {
    const months = ["January", "February", "March", "April", "May", "June", 
                    "July", "August", "September", "October", "November", "December"];
    return months[month - 1];
  };
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        .container { max-width: 800px; margin: 0 auto; background: white; }
        .header { text-align: center; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; margin-bottom: 20px; }
        .company-name { font-size: 24px; font-weight: bold; color: #1e40af; }
        .slip-title { font-size: 18px; color: #6b7280; margin-top: 5px; }
        .employee-details { background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .section { margin-bottom: 20px; }
        .section-title { font-size: 16px; font-weight: bold; color: #374151; border-left: 4px solid #3b82f6; padding-left: 10px; margin-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        th { background: #f9fafb; font-weight: 600; }
        .text-right { text-align: right; }
        .total-row { font-weight: bold; background: #f3f4f6; }
        .net-salary { background: #dbeafe; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; }
        .net-amount { font-size: 28px; font-weight: bold; color: #2563eb; }
        .footer { text-align: center; font-size: 12px; color: #9ca3af; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="company-name">Business Manager</div>
          <div class="slip-title">Salary Slip - ${getMonthName(salary.month)} ${salary.year}</div>
        </div>
        
        <div class="employee-details">
          <div><strong>Employee Name:</strong> ${worker.name}</div>
          <div><strong>Designation:</strong> ${worker.designation}</div>
          <div><strong>Employee ID:</strong> ${worker._id.slice(-6)}</div>
          <div><strong>Payment Date:</strong> ${salary.paymentDetails?.paidAt ? new Date(salary.paymentDetails.paidAt).toLocaleDateString() : "Pending"}</div>
        </div>
        
        <div class="section">
          <div class="section-title">Earnings</div>
          <table>
            <thead>
              <tr><th>Description</th><th class="text-right">Amount (₹)</th></tr>
            </thead>
            <tbody>
              <tr><td>Basic Salary (${salary.attendance?.weekdayPresent || 0} days)</td><td class="text-right">${formatNumber(salary.earnings?.weekdayPay)}</td></tr>
              ${salary.attendance?.weekdayHalf > 0 ? `<tr><td>Half Days (${salary.attendance?.weekdayHalf} days)</td><td class="text-right">${formatNumber(salary.earnings?.weekdayHalfPay)}</td></tr>` : ''}
              ${salary.attendance?.sundayPresent > 0 ? `<tr><td>Sunday Present (${salary.attendance?.sundayPresent} days) - Double Pay</td><td class="text-right">${formatNumber(salary.earnings?.sundayPresentPay)}</td></tr>` : ''}
              ${salary.attendance?.sundayHalf > 0 ? `<tr><td>Sunday Half Day (${salary.attendance?.sundayHalf} days) - 1.5x</td><td class="text-right">${formatNumber(salary.earnings?.sundayHalfPay)}</td></tr>` : ''}
              ${salary.attendance?.sundayHoliday > 0 ? `<tr><td>Sunday Holiday (${salary.attendance?.sundayHoliday} days)</td><td class="text-right">${formatNumber(salary.earnings?.sundayHolidayPay)}</td></tr>` : ''}
              ${salary.attendance?.otherHolidays > 0 ? `<tr><td>Other Holidays (${salary.attendance?.otherHolidays} days)</td><td class="text-right">${formatNumber(salary.earnings?.otherHolidayPay)}</td></tr>` : ''}
              ${salary.attendance?.overtimeHours > 0 ? `<tr><td>Overtime (${salary.attendance?.overtimeHours} hours)</td><td class="text-right">${formatNumber(salary.earnings?.overtimePay)}</td></tr>` : ''}
              <tr class="total-row"><td>Total Earnings</td><td class="text-right">${formatNumber(salary.earnings?.totalEarnings)}</td></tr>
            </tbody>
          </table>
        </div>
        
        <div class="section">
          <div class="section-title">Deductions</div>
          <table>
            <thead>
              <tr><th>Description</th><th class="text-right">Amount (₹)</th></tr>
            </thead>
            <tbody>
              ${salary.deductions?.monthlyAdvanceDeducted > 0 ? `<tr><td>Monthly Advance</td><td class="text-right">-${formatNumber(salary.deductions?.monthlyAdvanceDeducted)}</td></tr>` : ''}
              ${salary.deductions?.loanDeducted > 0 ? `<tr><td>Loan</td><td class="text-right">-${formatNumber(salary.deductions?.loanDeducted)}</td></tr>` : ''}
              <tr class="total-row"><td>Total Deductions</td><td class="text-right">-${formatNumber(salary.deductions?.totalDeductions)}</td></tr>
            </tbody>
          </table>
        </div>
        
        <div class="net-salary">
          <div>Net Salary Payable</div>
          <div class="net-amount">₹${formatNumber(salary.netSalary)}</div>
          ${salary.paymentDetails?.paymentNotes ? `<div style="font-size: 12px; margin-top: 5px;">Notes: ${salary.paymentDetails.paymentNotes}</div>` : ''}
        </div>
        
        <div class="footer">
          <p>This is a computer-generated document. No signature required.</p>
          <p>Generated on: ${new Date().toLocaleString('en-IN')}</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

module.exports = router;