import { getUserAccounts } from '@/actions/dashboard';
import { defaultCategories } from '@/data/categories';
import { AddTransactionForm } from '../_components/transaction-form';
import { getTransaction } from '@/actions/transaction';
import { notFound } from 'next/navigation';

export default async function AddTransactionPage({ searchParams }) {
  const accounts = await getUserAccounts();
  const { edit: editId } = (await searchParams) ?? {};

  let initialData = null;
  if (editId) {
    initialData = await getTransaction(editId);
    // A stale or foreign id used to crash the page; it is simply not found.
    if (!initialData) notFound();
  }

  return (
    <div className="max-w-3xl mx-auto px-5">
      <h1 className="text-5xl gradient-title mb-8">
        {editId ? "Edit" : "Add"} Transaction
      </h1>

      <AddTransactionForm
        accounts={accounts}
        categories={defaultCategories}
        editMode={!!editId}
        initialData={initialData}
      />
    </div>
  );
}
