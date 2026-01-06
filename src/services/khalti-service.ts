
interface KhaltiConfig {
  baseUrl: string;
  secretKey: string;
  publicKey: string;
  websiteUrl: string;
  returnUrl: string;
}

interface InitiatePaymentParams {
  amount: number; // in paisa
  purchaseOrderId: string;
  purchaseOrderName: string;
  customerInfo?: {
    name: string;
    email: string;
    phone: string;
  };
}

interface KhaltiInitiateResponse {
  pidx: string;
  payment_url: string;
  expires_at: string;
  expires_in: number;
}

interface KhaltiVerifyResponse {
  pidx: string;
  total_amount: number;
  status: 'Completed' | 'Pending' | 'Initiated' | 'Refunded' | 'Expired' | 'User canceled';
  transaction_id: string;
  fee: number;
  refunded: boolean;
  purchase_order_id: string;
  purchase_order_name?: string;
}

const config: KhaltiConfig = {
  baseUrl: process.env.KHALTI_BASE_URL || 'https://a.khalti.com/api/v2',
  secretKey: process.env.KHALTI_SECRET_KEY || '',
  publicKey: process.env.KHALTI_PUBLIC_KEY || '',
  // For mobile callback, use a deep link scheme if possible, or a backend endpoint that redirects
  returnUrl: process.env.KHALTI_RETURN_URL || 'http://192.168.1.65:3000/api/payments/callback', // Replace with dynamic host in prod
  websiteUrl: process.env.WEBSITE_URL || 'https://eventmanager.com',
};

export const khaltiService = {
  async initiatePayment(params: InitiatePaymentParams): Promise<KhaltiInitiateResponse> {
    if (!config.secretKey) {
      throw new Error('Khalti secret key not configured');
    }

    const payload = {
      return_url: config.returnUrl,
      website_url: config.websiteUrl,
      amount: params.amount,
      purchase_order_id: params.purchaseOrderId,
      purchase_order_name: params.purchaseOrderName,
      customer_info: params.customerInfo,
    };

    console.log('[Khalti] Initiating payment:', JSON.stringify(payload, null, 2));

    const response = await fetch(`${config.baseUrl}/epayment/initiate/`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${config.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Khalti] Initiate failed:', errorText);
      throw new Error(`Khalti initiate failed: ${errorText}`);
    }

    return await response.json();
  },

  async verifyPayment(pidx: string): Promise<KhaltiVerifyResponse> {
    if (!config.secretKey) {
      throw new Error('Khalti secret key not configured');
    }

    const response = await fetch(`${config.baseUrl}/epayment/lookup/`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${config.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pidx }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('[Khalti] Lookup failed:', errorText);
        throw new Error(`Khalti lookup failed: ${errorText}`);
    }

    return await response.json();
  }
};
