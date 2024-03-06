import { useUser } from "@clerk/nextjs";
import { PageLayout } from "~/components/layout";
import { Toaster } from "~/components/ui/sonner";
import { api } from "~/utils/api";

export default function Home() {
  const user = useUser();

  const { data, isLoading } = api.list.getAll.useQuery();

  return (
    <>
      <PageLayout>
        <div>COSAS</div>
        <Toaster />
      </PageLayout>
    </>
  );
}
