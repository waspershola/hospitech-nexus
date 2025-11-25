import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
  Hr,
  Section,
} from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';

interface CheckoutReminderEmailProps {
  guestName: string;
  hotelName: string;
  roomType: string;
  checkoutDate: string;
  checkoutTime: string;
  hoursUntilCheckout: number;
  balance?: number;
  currency?: string;
  hotelPhone?: string;
  hotelEmail?: string;
}

export const CheckoutReminderEmail = ({
  guestName,
  hotelName,
  roomType,
  checkoutDate,
  checkoutTime,
  hoursUntilCheckout,
  balance = 0,
  currency = '₦',
  hotelPhone,
  hotelEmail,
}: CheckoutReminderEmailProps) => {
  const isUrgent = hoursUntilCheckout <= 2;
  const greeting = hoursUntilCheckout <= 2 
    ? `Your checkout time is approaching soon!` 
    : `Reminder: Your checkout is tomorrow`;

  return (
    <Html>
      <Head />
      <Preview>{greeting} - {hotelName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{hotelName}</Heading>
          <Text style={text}>Dear {guestName},</Text>
          
          <Text style={text}>{greeting}</Text>

          <Section style={infoBox}>
            <Text style={infoTitle}>Checkout Details</Text>
            <Hr style={hr} />
            <table style={infoTable}>
              <tr>
                <td style={infoLabel}>Room Type:</td>
                <td style={infoValue}>{roomType}</td>
              </tr>
              <tr>
                <td style={infoLabel}>Checkout Date:</td>
                <td style={infoValue}>{checkoutDate}</td>
              </tr>
              <tr>
                <td style={infoLabel}>Checkout Time:</td>
                <td style={infoValue}>{checkoutTime}</td>
              </tr>
              <tr>
                <td style={infoLabel}>Time Remaining:</td>
                <td style={{...infoValue, fontWeight: 'bold', color: isUrgent ? '#dc2626' : '#16a34a'}}>
                  {hoursUntilCheckout} hours
                </td>
              </tr>
            </table>
          </Section>

          {balance > 0 && (
            <Section style={warningBox}>
              <Text style={warningText}>
                ⚠️ <strong>Outstanding Balance:</strong> {currency}{balance.toLocaleString()}
              </Text>
              <Text style={warningSubtext}>
                Please settle your outstanding balance before checkout.
              </Text>
            </Section>
          )}

          <Section style={tipsBox}>
            <Text style={tipsTitle}>Checkout Tips:</Text>
            <ul style={tipsList}>
              <li style={tipsItem}>Please ensure all personal belongings are packed</li>
              <li style={tipsItem}>Return all room keys and access cards to the front desk</li>
              <li style={tipsItem}>Settle any outstanding charges or minibar items</li>
              <li style={tipsItem}>Request a late checkout if you need more time (additional fees may apply)</li>
            </ul>
          </Section>

          <Text style={text}>
            If you need assistance or have any questions, please don't hesitate to contact us.
          </Text>

          {(hotelPhone || hotelEmail) && (
            <>
              <Hr style={hr} />
              <Text style={contactText}>
                {hotelPhone && (
                  <>📞 Phone: <Link href={`tel:${hotelPhone}`} style={link}>{hotelPhone}</Link><br /></>
                )}
                {hotelEmail && (
                  <>📧 Email: <Link href={`mailto:${hotelEmail}`} style={link}>{hotelEmail}</Link></>
                )}
              </Text>
            </>
          )}

          <Text style={footer}>
            Thank you for staying with {hotelName}. We hope you enjoyed your visit!
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default CheckoutReminderEmail;

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  borderRadius: '8px',
  maxWidth: '600px',
};

const h1 = {
  color: '#1a1a1a',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '40px 20px 20px',
  padding: '0',
  textAlign: 'center' as const,
};

const text = {
  color: '#404040',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 20px',
};

const infoBox = {
  backgroundColor: '#f0f9ff',
  borderRadius: '8px',
  border: '1px solid #bae6fd',
  margin: '24px 20px',
  padding: '20px',
};

const infoTitle = {
  color: '#0c4a6e',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 12px',
};

const infoTable = {
  width: '100%',
  marginTop: '12px',
};

const infoLabel = {
  color: '#64748b',
  fontSize: '14px',
  paddingBottom: '8px',
};

const infoValue = {
  color: '#1e293b',
  fontSize: '14px',
  fontWeight: '600',
  paddingBottom: '8px',
  textAlign: 'right' as const,
};

const warningBox = {
  backgroundColor: '#fef2f2',
  borderRadius: '8px',
  border: '1px solid #fecaca',
  margin: '24px 20px',
  padding: '16px 20px',
};

const warningText = {
  color: '#991b1b',
  fontSize: '16px',
  margin: '0 0 8px',
};

const warningSubtext = {
  color: '#dc2626',
  fontSize: '14px',
  margin: '0',
};

const tipsBox = {
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  border: '1px solid #e5e7eb',
  margin: '24px 20px',
  padding: '20px',
};

const tipsTitle = {
  color: '#374151',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 12px',
};

const tipsList = {
  margin: '0',
  paddingLeft: '20px',
};

const tipsItem = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '22px',
  marginBottom: '8px',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 0',
};

const link = {
  color: '#2563eb',
  textDecoration: 'underline',
};

const contactText = {
  color: '#404040',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '16px 20px',
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  margin: '24px 20px',
  textAlign: 'center' as const,
};
