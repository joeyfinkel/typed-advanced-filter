import {
  basicDateOptions,
  createAdvancedFilterRows,
  createDateOptions,
  RowFilter,
} from '@typed-advanced-filter/core';

const rows = createAdvancedFilterRows(['name', 'createdAt', 'total'], {
  name: {
    rules: {
      contains: 'Contains',
      'not-contains': {
        text: 'Not Contains',
        type: 'string',
      },
      'is-empty': 'Empty',
    },
    text: 'Name',
    type: 'string',
  },

  createdAt: {
    text: 'Created at',
    type: 'date',
    rules: {
      eq: {
        text: 'Is on',
        children: basicDateOptions,
      },
      neq: {
        text: 'Is not on',
        children: basicDateOptions,
      },
      'is-empty': {
        text: 'Is empty',
        type: 'empty',
      },
      'is-not-empty': { text: 'Is not empty', type: 'empty' },
      between: {
        text: 'Is between',
        children: createDateOptions({
          filterType: 'basic',
          include: ['custom-date', 'day-of-week'],
        }),
      },
      gt: {
        text: 'Is after',
        children: basicDateOptions,
      },
      lt: {
        text: 'Is before',
        children: basicDateOptions,
      },
    },
  },

  total: {
    text: 'Total',
    type: 'number',
    rules: {
      eq: '=',
      gt: '>',
      gte: '>=',
    },
  },
});

const createdFilters = rows.createFilter({
  filterMap: {
    and: {
      createdAt: {
        operator: 'gt',
        value: 'friday',
      },
      name: {
        operator: 'contains',
        value: 'hi',
      },
      or: {
        createdAt: {
          operator: 'eq',
          value: 'yesterday',
        },
        total: {
          operator: 'eq',
          value: 34,
        },
        and: {
          createdAt: {
            operator: 'between',
            value: ['monday', 'wednesday'],
          },
          or: {
            total: {
              operator: 'gte',
              value: 1,
            },
          },
        },
      },
    },
  },
  queryStringTransformer: {
    total({ field, operators: { eq } }) {
      // return { eq: `this is eq (${eq}) for ${field}` };
      console.log(eq)
      return {
        'and.or.total.eq': `This is eq ${eq.value} for ${field}`,
      };
    },
    createdAt({ field, operators: { gt, between, eq } }) {
      return {
        'and.or.and.createdAt.between': 'this is between',
        'and.or.createdAt.eq': 'this is eq',
        'and.createdAt.gt': 'this is gt',
      };
    },
    // name({ field, operators: { contains }, queryString }) {
    //   return {};
    // },
  },
  customSymbols: {},
});

function App() {
  console.log(createdFilters);

  // console.log(filter);
  return (
    <div className='app'>
      {/* <AdvancedFilter rows={rows} filters={filter} /> */}
      {/* <pre>{JSON.stringify(rows, null, 2)}</pre> */}
    </div>
  );
}

export default App;
