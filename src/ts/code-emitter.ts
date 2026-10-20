import type { RenderedType, TypeEntry } from './types.js';

/** Syntax helpers; TypeScript type inspection belongs to the renderers. */
export class CodeEmitter {
  constructor(readonly runtime: string) {}

  call(name: string, ...args: string[]): string {
    return `${this.runtime}.${name}(${args.join(', ')})`;
  }

  primitive(name: string, type = name): RenderedType {
    return { code: `${this.runtime}.${name}`, type };
  }

  guard(type: string, expression: string): RenderedType {
    return {
      code: this.call(
        'fromGuard',
        `(value): value is ${type} => ${expression}`,
        JSON.stringify(type),
      ),
      type,
    };
  }

  reference(entry: TypeEntry): RenderedType {
    return {
      code: this.call('ref', `() => ${entry.name}`, JSON.stringify(entry.name)),
      type: entry.name,
    };
  }

  combine(name: 'oneOf' | 'allOf', members: RenderedType[]): RenderedType {
    return {
      code: this.call(name, ...members.map((member) => member.code)),
      type: members
        .map((member) => `(${member.type})`)
        .join(name === 'oneOf' ? ' | ' : ' & '),
    };
  }

  import(moduleName: string): string {
    return `import * as ${this.runtime} from ${JSON.stringify(moduleName)};`;
  }

  declaration(entry: TypeEntry, rendered: RenderedType): string {
    const prefix = entry.exported ? 'export ' : '';
    return `${prefix}type ${entry.name} = ${rendered.type};\n${prefix}const ${entry.name}: ${this.runtime}.Caster<${entry.name}> = ${rendered.code};`;
  }
}
