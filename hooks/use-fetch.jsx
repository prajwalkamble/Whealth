import { useState } from "react";
import { toast } from "sonner";

const useFetch = (cb) => {
  const [data, setData] = useState(undefined);
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState(null);

  const fn = async (...args) => {
    // Clearing data up front matters: callers key their success effects on
    // `data && !loading`, so leaving the previous call's result in place made a
    // failed retry re-run them against a stale success.
    setData(undefined);
    setLoading(true);
    setError(null);

    try {
      const response = await cb(...args);
      setData(response);
      setError(null);
      return response;
    } catch (error) {
      setError(error);
      // The only place a failed action is reported. Callers must not add their
      // own error toast on top of this one.
      toast.error(error.message);
      return undefined;
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, fn, setData };
};

export default useFetch;
