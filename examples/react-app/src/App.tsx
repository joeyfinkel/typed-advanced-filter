import { createFilterRows } from '@typed-advanced-filter/core';

const rows = createFilterRows(['name'], {
  name: {
    rules: {
      contains: 'Contains',
      'not-contains': {
        text: 'Not Contains',
        type: 'string',
      },
    },
    text: 'Name',
    type: 'string',
  },
  // id: {
  //   rules: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte'],
  //   text: 'ID',
  //   type: 'number',
  // },
});

function App() {
  console.log(rows);
  return (
    <div className='app'>
      <pre>{JSON.stringify(rows, null, 2)}</pre>
    </div>
  );
}

export default App;
