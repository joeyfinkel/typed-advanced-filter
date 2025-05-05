type QueryStringToken =
  | { type: 'paren'; value: '(' | ')' }
  | { type: 'word'; value: string }
  | { type: 'string'; value: string };
type QueryStringASTNode =
  | { type: 'group'; children: QueryStringASTNode[] }
  | { type: 'word'; value: string }
  | { type: 'string'; value: string };
type QueryStringASTNodeTypes = Pick<QueryStringASTNode, 'type'>['type'];
type CustomFormatFunctionOptions<TType extends QueryStringASTNodeTypes> = {
  type: TType;
  pad: string;
  defaultOutput: string;
};
type CustomFormatFunction<
  TType extends QueryStringASTNodeTypes,
  TExtraOptions = {},
> = (options: CustomFormatFunctionOptions<TType> & TExtraOptions) => string;
type FormatASTFn = (
  node: QueryStringASTNode,
  customFormatter?: CustomFormatOptions,
  indent?: number
) => string;
type CustomFormatOptions = {
  [Key in QueryStringASTNodeTypes]?: CustomFormatFunction<
    Key,
    Key extends 'group'
      ? {
          currentIndent: number;
          customFormatter: CustomFormatOptions;
          children: Array<QueryStringASTNode>;
          formatAST: FormatASTFn;
        }
      : {
          value: string;
        }
  >;
};

function tokenize(input: string) {
  const tokens: QueryStringToken[] = [];
  let i = 0;

  while (i < input.length) {
    const char = input[i];

    if (char === '(' || char === ')') {
      tokens.push({ type: 'paren', value: char });
      i++;
    } else if (char === "'") {
      let value = '';
      i++; // skip opening quote
      while (i < input.length && input[i] !== "'") {
        value += input[i++];
      }
      i++; // skip closing quote
      tokens.push({ type: 'string', value });
    } else if (/\s/.test(char)) {
      i++; // skip whitespace
    } else {
      let value = '';
      while (
        i < input.length &&
        !/\s/.test(input[i]) &&
        input[i] !== '(' &&
        input[i] !== ')'
      ) {
        value += input[i++];
      }
      tokens.push({ type: 'word', value });
    }
  }

  return tokens;
}

function parse(tokens: QueryStringToken[]) {
  let i = 0;

  function walk(): QueryStringASTNode {
    const token = tokens[i];

    if (!token) throw new Error('Unexpected end of input');

    if (token.type === 'paren' && token.value === '(') {
      i++; // skip '('
      const children: QueryStringASTNode[] = [];
      while (
        i < tokens.length &&
        !(tokens[i].type === 'paren' && tokens[i].value === ')')
      ) {
        children.push(walk());
      }
      if (tokens[i]?.type === 'paren' && tokens[i].value === ')') {
        i++; // skip ')'
      }
      return { type: 'group', children };
    }

    if (token.type === 'word') {
      i++;
      return { type: 'word', value: token.value };
    }

    if (token.type === 'string') {
      i++;
      return { type: 'string', value: token.value };
    }

    throw new Error(`Unexpected token: ${JSON.stringify(token)}`);
  }

  return walk();
}

function formatAST(
  node: QueryStringASTNode,
  customFormatter?: CustomFormatOptions,
  indent = 0
): string {
  const pad = '  '.repeat(indent);

  if (node.type === 'group') {
    const output =
      pad +
      '(\n' +
      node.children
        .map((child) => formatAST(child, customFormatter, indent + 1))
        .join('\n') +
      '\n' +
      pad +
      ')';
    const custom = customFormatter?.group?.({
      children: node.children,
      pad,
      type: 'group',
      formatAST,
      defaultOutput: output,
      currentIndent: indent,
      customFormatter,
    });

    return custom ?? output;
  }

  if (node.type === 'word') {
    const output = pad + node.value;
    const custom = customFormatter?.word?.({
      type: 'word',
      pad,
      value: node.value,
      defaultOutput: output,
    });

    return custom ?? output;
  }

  if (node.type === 'string') {
    const output = pad + `'${node.value}'`;
    const custom = customFormatter?.string?.({
      type: 'string',
      pad,
      value: node.value,
      defaultOutput: output,
    });

    return custom ?? output;
  }

  return '';
}

export class QueryString {
  private _value: string = '';

  public get value(): string {
    return this._value;
  }
  public set value(value: string) {
    this._value = value;
  }

  constructor(queryString?: string) {
    this.value = queryString ?? '';
  }

  removeParenthesis() {
    this._value = this.value.replaceAll('(', '').replaceAll(')', '');

    return this;
  }

  format(options?: CustomFormatOptions) {
    const tokens = tokenize(this.value);
    const ast = parse(tokens);
    this._value = formatAST(ast, options);

    return this;
  }
}
