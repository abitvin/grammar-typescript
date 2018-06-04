///<reference path="../../Source/Grammar.ts"/>

namespace Abitvin
{
    interface Lml
    {
        children: Lml[],
        tag: string,
        text: string,
    }
    
    export class LmlReader
    {
        private static _grammar: Grammar<Lml, void>;
        
        public static initialize(): void
        {
            const branchFn = b => 
            {
                let tag = null;

                if (b.length > 0 && b[0].tag != null)
                    tag = b.shift().tag;    
                
                return {
                    children: b,
                    tag: tag,
                    text: null,
                }
            };

            const tagFn = (_, l) => 
            {
                return {
                    children: null,
                    tag: l,
                    text: null,
                }
            };

            const textFn = (_, l) => 
            {
                return {
                    children: null,
                    tag: null,
                    text: l,
                }
            };

            this._grammar = new Grammar<Lml, void>();
            this._grammar.ws("(\\ |\t|\n|\r)");
            this._grammar.declare("branch", "branch-start");
            this._grammar.add("escape-chars", "(~\\{\\{,\\{|\\}\\},\\})");
            this._grammar.add("control-chars", "(\\ |\t|\n|\r|\\{|\\})");
            this._grammar.add("char", "(<escape-chars>|!<control-chars>.)");
            this._grammar.add("tag", "<char>+", tagFn);
            this._grammar.add("word", "!<branch-start><char>+");
            this._grammar.add("text", "<word>( <word>)*", textFn);
            this._grammar.add("child", "(<text>|<branch>)");
            this._grammar.add("children", "<child>( <child>)*");
            this._grammar.add("branch-start", "<tag> \\{!(\\{)");
            this._grammar.add("branch", "<branch-start> <children>? }", branchFn);
            this._grammar.add("root", " <children>? ", branchFn);
        }
        
        public static read(input: string): RuleResult<Lml, void>
        {
            if (this._grammar == null)
                this.initialize();
            
            return this._grammar.scan("root", input);
        }
    }
}