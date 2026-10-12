// The signed change a transaction applies to its account balance.
//
// Lifted out of actions/transaction.js, which is a "use server" module: every
// export of one is a public endpoint and must be async, so nothing else could
// import this. It now lives here because statements need the same rule.
//
// This is the single definition of how a transaction moves a balance. An
// account's stored balance is maintained with it on every create, update and
// delete, which is what makes an opening balance recoverable: take the current
// balance and unwind the effects since the period began. A second copy of this
// formula anywhere would silently desynchronise statements from the ledger.
export const balanceEffect = (type, amount) =>
  type === "EXPENSE" ? -Number(amount) : Number(amount);

// The balance an account held at `from`, worked backwards from what it holds
// now by removing everything that has happened since.
//
// Only correct while balanceEffect above is the only thing that writes to
// Account.balance. It is.
export const openingBalance = (currentBalance, transactionsSince) =>
  transactionsSince.reduce(
    (balance, t) => balance - balanceEffect(t.type, t.amount),
    Number(currentBalance)
  );
