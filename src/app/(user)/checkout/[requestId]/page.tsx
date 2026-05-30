import { CheckoutStateMachine } from "@/components/user/checkout-state-machine";

interface Props {
  params: Promise<{ requestId: string }>;
}

export default async function CheckoutPage({ params }: Props) {
  const { requestId } = await params;
  return (
    <div className="max-w-sm mx-auto">
      <CheckoutStateMachine requestId={requestId} />
    </div>
  );
}
