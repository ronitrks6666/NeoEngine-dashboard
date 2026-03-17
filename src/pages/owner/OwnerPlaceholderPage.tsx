interface OwnerPlaceholderPageProps {
  title: string;
  checkpoint?: number;
}

export function OwnerPlaceholderPage({ title, checkpoint = 0 }: OwnerPlaceholderPageProps) {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">{title}</h1>
      <p className="text-gray-600">
        {checkpoint ? `(Checkpoint ${checkpoint})` : 'Coming soon'}
      </p>
    </div>
  );
}
