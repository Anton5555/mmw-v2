import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About',
  description: 'Sobre nosotros',
};

export default async function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">Sobre nosotros</h1>

      <div className="max-w-3xl mx-auto">
        <div className="relative aspect-video mb-8 rounded-lg overflow-hidden">
          <video className="w-full" controls preload="metadata" autoPlay>
            <source src="/intro.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>

        <div className="prose dark:prose-invert max-w-none">
          <p className="text-lg mb-4">Acá va texto no tengo ganas de pensar</p>
        </div>
      </div>
    </div>
  );
}
