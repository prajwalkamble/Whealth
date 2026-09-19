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

      // Actions report expected failures by returning { success: false }
      // rather than throwing (see lib/action-error.js), so that the message
      // survives production builds. Treat that exactly like a throw.
      if (response?.success === false) {
        const failure = new Error(response.error);
        setError(failure);
        toast.error(response.error);
        return response;
      }

      setData(response);
      setError(null);
      return response;
    } catch (error) {
      setError(error);
      // The only place a failed action is reported. Callers must not add their
      // own error toast on top of this one. A throw that reaches here is
      // unexpected (network failure, a crash); its message may be generic.
      toast.error(error.message);
      return undefined;
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, fn, setData };
};

export default useFetch;
