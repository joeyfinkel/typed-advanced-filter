import { add } from '@monorepo/core';

export const Button = () => {
  return (
    <button onClick={() => console.log(add(1, 2))}>
      Click me
    </button>
  );
};