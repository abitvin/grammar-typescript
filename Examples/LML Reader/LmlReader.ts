///<reference path="../../Source/Grammer.ts"/>

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
        private static _grammer: Grammer<Lml, void>;
        
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

            this._grammer = new Grammer<Lml, void>();
            this._grammer.ws("(\\ |\t|\n|\r)");
            this._grammer.declare("branch", "branch-start");
            this._grammer.add("escape-chars", "(~\\{\\{,\\{|\\}\\},\\})");
            this._grammer.add("control-chars", "(\\ |\t|\n|\r|\\{|\\})");
            this._grammer.add("char", "(<escape-chars>|!<control-chars>.)");
            this._grammer.add("tag", "<char>+", tagFn);
            this._grammer.add("word", "!<branch-start><char>+");
            this._grammer.add("text", "<word>( <word>)*", textFn);
            this._grammer.add("child", "(<text>|<branch>)");
            this._grammer.add("children", "<child>( <child>)*");
            this._grammer.add("branch-start", "<tag> \\{!(\\{)");
            this._grammer.add("branch", "<branch-start> <children>? }", branchFn);
            this._grammer.add("root", " <children>? ", branchFn);
        }
        
        public static read(input: string): RuleResult<Lml, void>
        {
            if (this._grammer == null)
                this.initialize();
            
            return this._grammer.scan("root", input);
        }
    }
}