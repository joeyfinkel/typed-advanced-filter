import { createFilterRows } from '@typed-advanced-filter/core';

const rows = createFilterRows({
  name: {
    rules: ['is', 'is-not', 'contains', 'not-contains'],
    text: 'Name',
    type: 'string',
  },
  id: {
    rules: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte'],
    text: 'ID',
    type: 'number',
  },
});
// const rows = createFilterRows(['name', 'id'], {
function App() {
  console.log(rows);
  return (
    <div className='app'>
      <pre>{JSON.stringify(rows, null, 2)}</pre>
    </div>
  );
}

export default App;
