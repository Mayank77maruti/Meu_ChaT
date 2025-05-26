// utils/emailApi.ts
export const sendEmailNotification = async (
    senderEmail: string,
    recipientEmail: string,
    message: string
  ) => {
    console.log('=== FRONTEND EMAIL CALL ===');
    console.log('Sender:', senderEmail);
    console.log('Recipient:', recipientEmail);
    console.log('Message:', message);
    
    try {
      const requestBody = {
        senderEmail,
        recipientEmail,
        message
      };
      
      console.log('Making API request to /api/send-notification');
      console.log('Request body:', requestBody);
      
      const response = await fetch('/api/send-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      console.log('Response headers:', response.headers);
      
      // Check if response has content before trying to parse JSON
      const responseText = await response.text();
      console.log('Raw response text:', responseText);
      
      if (!responseText) {
        throw new Error('Empty response from server');
      }
      
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse JSON response:', parseError);
        console.error('Response text was:', responseText);
        throw new Error(`Invalid JSON response: ${responseText}`);
      }
      
      console.log('Parsed response data:', responseData);
      
      if (!response.ok) {
        console.error('API returned error:', responseData);
        throw new Error(responseData.error || `HTTP ${response.status}: ${responseText}`);
      }
      
      console.log('Email notification sent successfully');
      return responseData;
      
    } catch (error) {
      console.error('=== EMAIL API ERROR ===');
      console.error('Error sending email notification:', error);
      console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  };