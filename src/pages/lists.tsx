import Head from "next/head";
import { toast } from "sonner";
import { PageLayout } from "~/components/layout";
import { listToImport } from "~/server/helpers/list-aux";
import { type RouterInputs, api } from "~/utils/api";

type ListWithMovies = RouterInputs["list"]["create"];

const Lists = () => {
  const ctx = api.useUtils();

  const { mutate, isLoading: isPosting } = api.list.create.useMutation({
    onSuccess: () => {
      void ctx.list.getAll.invalidate();
    },
    onError: (e) => {
      const errorMessage = e.data?.zodError?.fieldErrors.content;
      if (errorMessage?.[0]) {
        toast.error(errorMessage[0]);
      } else {
        toast.error("Failed to post! Try later.");
      }
    },
  });

  const createNewList = () => {
    const newList: ListWithMovies = {
      name: listToImport.name,
      description: listToImport.description,
      letterboxdUrl: listToImport.link,
      imgUrl: listToImport.img,
      createdBy: listToImport.by,
      tags: listToImport.words,
      imdbIds: listToImport.movies.map((movie) => movie.imdb_id),
    };

    // mutate(newList);
  };

  return (
    <>
      <Head>
        <title>Listas</title>
      </Head>
      <PageLayout>
        <div>
          Acá van las listas.
          {/* <button onClick={createNewList}>Crear lista</button> */}
        </div>
      </PageLayout>
    </>
  );
};

export default Lists;
