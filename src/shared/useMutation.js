import { useState } from 'react';

export default function useMutation(fn) {
  const [busy, setBusy] = useState(false);
  const doMutate = async (...args) => {
    setBusy(true);
    try {
      return await fn(...args);
    } finally {
      setBusy(false);
    }
  };
  return [doMutate, busy];
}
