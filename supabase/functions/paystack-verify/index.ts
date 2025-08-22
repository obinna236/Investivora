import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { reference } = await req.json()

    // Get Paystack secret key from environment
    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY')
    if (!paystackSecretKey) {
      throw new Error('Paystack secret key not configured')
    }

    // Verify payment with Paystack
    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        'Authorization': `Bearer ${paystackSecretKey}`,
      }
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || 'Failed to verify payment')
    }

    // Update deposit status in database if payment is successful
    if (data.data.status === 'success') {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      
      const supabase = createClient(supabaseUrl, supabaseServiceKey)

      // Update deposit status to 'success' to trigger referral bonus
      const { error: depositError } = await supabase
        .from('deposits')
        .update({ 
          status: 'success'
        })
        .eq('reference', reference)

      if (depositError) {
        console.error('Error updating deposit:', depositError)
      }

      // Update user balance
      const amount = data.data.amount / 100 // Convert from kobo to naira
      const userId = data.data.metadata.user_id

      const { error: balanceError } = await supabase.rpc('increment_user_balance', {
        user_id: userId,
        amount: amount
      })

      if (balanceError) {
        console.error('Error updating balance:', balanceError)
      }

      // Create transaction record
      await supabase
        .from('transactions')
        .insert({
          user_id: userId,
          type: 'credit',
          amount: amount,
          description: `Deposit via Paystack - ${reference}`
        })
    }

    return new Response(
      JSON.stringify(data.data),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})