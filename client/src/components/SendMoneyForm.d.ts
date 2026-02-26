declare module "@/components/SendMoneyForm" {
  type TransferType = "send_money" | "airtime_topup";

  export type SendMoneyFormProps = {
    forcedTransferType?: TransferType | null;
  };

  export default function SendMoneyForm(props: SendMoneyFormProps): JSX.Element;
}
