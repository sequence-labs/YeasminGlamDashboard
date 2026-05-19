import { getGetContractQueryKey, useGetContract } from "@workspace/api-client-react";
import { useRoute } from "wouter";
import ContractView from "@/pages/contract-view";
import BridalContractView from "@/pages/bridal-contract-view";
import { Skeleton } from "@/components/ui/skeleton";

function isBridalContractName(name?: string) {
  return Boolean(name?.toLowerCase().includes("bridal") && !name.toLowerCase().includes("non-bridal"));
}

export default function ContractRoute() {
  const [, params] = useRoute("/bookings/:id/contract");
  const id = parseInt(params?.id || "0", 10);
  const { data: contract, isLoading } = useGetContract(id, {
    query: { enabled: !!id, queryKey: getGetContractQueryKey(id) },
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-8 space-y-8">
        <Skeleton className="h-12 w-64 mx-auto" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isBridalContractName(contract?.contractTemplate?.name)) {
    return <BridalContractView />;
  }

  return <ContractView />;
}
