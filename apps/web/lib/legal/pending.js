// A decision the operator or their lawyers must make before publication.
//
// Shared by the legal pages so there is one way of marking a gap, and one way
// of rendering it -- visibly, so a page cannot quietly ship with an invented
// answer in place of a real one.
export const pendingDecision = (what) => ({ pending: true, what });
