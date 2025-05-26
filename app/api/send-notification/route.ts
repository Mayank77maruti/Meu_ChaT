// app/api/send-notification/route.ts (for App Router)
import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  console.log('=== EMAIL API CALLED ===');
  console.log('URL:', request.url);
  console.log('Environment variables check:');
  console.log('EMAIL_USER:', process.env.EMAIL_USER ? 'SET' : 'NOT SET');
  console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? 'SET' : 'NOT SET');

  try {
    const { senderEmail, recipientEmail, message } = await request.json();

    console.log('Parsed data:');
    console.log('- Sender:', senderEmail);
    console.log('- Recipient:', recipientEmail);
    console.log('- Message length:', message?.length || 0);

    if (!senderEmail || !recipientEmail || !message) {
      console.log('Missing required fields');
      return NextResponse.json(
        { 
          error: 'Missing required fields',
          received: { senderEmail: !!senderEmail, recipientEmail: !!recipientEmail, message: !!message }
        },
        { status: 400 }
      );
    }

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log('Missing email environment variables');
      return NextResponse.json(
        { error: 'Email configuration missing' },
        { status: 500 }
      );
    }

    // Create transporter with detailed logging
    console.log('Creating email transporter...');
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      debug: true, // Enable debug output
      logger: true // Log to console
    });

    console.log('Verifying transporter...');
    await transporter.verify();
    console.log('Transporter verified successfully');

    const subject = `New message from ${senderEmail}`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; text-align: center;">MeuChat Notification</h1>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
          <h2 style="color: #343a40; margin-top: 0;">You have a new message!</h2>
          
          <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <p style="margin: 0 0 10px 0;"><strong style="color: #495057;">From:</strong> ${senderEmail}</p>
            <p style="margin: 0 0 15px 0;"><strong style="color: #495057;">Message:</strong></p>
            <div style="background-color: #e3f2fd; padding: 15px; border-left: 4px solid #2196f3; border-radius: 4px; font-style: italic;">
              "${message}"
            </div>
            <p style="color: #6c757d; font-size: 12px; margin: 15px 0 0 0;">
              <strong>Received:</strong> ${new Date().toLocaleString()}
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXTAUTH_URL || 'https://meu-chat-blond.vercel.app'}/chat" 
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                      color: white; 
                      padding: 12px 30px; 
                      text-decoration: none; 
                      border-radius: 25px; 
                      font-weight: bold;
                      display: inline-block;
                      box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
              Reply to Message
            </a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">
          <p style="color: #6c757d; font-size: 12px; text-align: center; margin: 0;">
            You're receiving this because someone sent you a message on MeuChat.
          </p>
        </div>
      </div>
    `;

    const mailOptions = {
      from: {
        name: 'MeuChat',
        address: process.env.EMAIL_USER
      },
      to: recipientEmail,
      subject: subject,
      html: htmlContent
    };

    console.log('Sending email with options:', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject
    });

    const result = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', result);

    return NextResponse.json({ 
      success: true, 
      message: 'Email notification sent successfully',
      messageId: result.messageId
    });

  } catch (error) {
    console.error('=== EMAIL ERROR ===');
    console.error('Error details:', error);
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');

    return NextResponse.json(
      { 
        error: 'Failed to send email notification',
        details: error instanceof Error ? error.message : 'Unknown error',
        code: error instanceof Error && 'code' in error ? error.code : 'NO_CODE'
      },
      { status: 500 }
    );
  }
}

// Handle other methods
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
