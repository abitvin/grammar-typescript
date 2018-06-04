///<reference path="../../Source/Grammar.ts"/>

namespace Abitvin
{
    interface IIni
    {
        [sectionOrProp: string]: string|IIni;
    }
    
    interface IScanContext
    {
        ini?: IIni;
        name?: string;
        value?: string;
    }
    
    export class IniReader
    {
        private static _currentScope: IIni;
        private static _grammar: Grammar<IScanContext, void>;
        private static _ini: IIni;
        
        public static initialize(): void
        {
            this._grammar = new Grammar<IScanContext, void>();

            // Comment
            this._grammar.add("comment-char", "[^\r\n]");
            this._grammar.add("comment", ";<comment-char>*");
            
            // Property
            const propNameFn = (b, l) => [{ name: l }];
            const propValueFn = (b, l) => [{ value: l }];
            const propFn = (b, l) => 
            {
                const name: string = b[0].name;
                const value: string = b[1].value;
                
                if (typeof this._currentScope[name] === "object")
                    throw new Error(`Section already exists with propertyname '${name}'.`);
                    
                this._currentScope[name] = value;
                return [];
            };
            
            this._grammar.add("prop-name-char", "[^\\[\\]\r\n=]");
            this._grammar.add("prop-name", "<prop-name-char>+", propNameFn);
            this._grammar.add("prop-value-char", "[^\r\n]");
            this._grammar.add("prop-value", "<prop-value-char>+", propValueFn);
            this._grammar.add("prop", "<prop-name>=<prop-value>", propFn);
            
            // Section
            const sectionRootFn = (b, l) => { this._currentScope = this._ini; return []; };
            
            const sectionScopeFn = (b, l: string) =>
            {
                if (typeof this._currentScope[l] === "string")
                    throw new Error(`Section by name '${l}' already used by a property.`);
                
                this._currentScope = this._currentScope[l] == null ? this._currentScope[l] = {} : <IIni>this._currentScope[l];
                return [];
            };
            
            this._grammar.add("section-char", "[^\\[\\]\r\n\\ \\.]");
            this._grammar.add("section-scope", "<section-char>+", sectionScopeFn);
            this._grammar.add("section-scope-loop", "\\.<section-scope>");
            this._grammar.add("section-root", "\\[", sectionRootFn);
            this._grammar.add("section", "<section-root><section-scope><section-scope-loop>*\\]");
            
            // Content
            this._grammar.add("content", "(<comment>|<prop>|<section>)");
            this._grammar.add("nl", "\r?\n");
            this._grammar.add("line", " <content>?(<nl>|$)");
            
            // Root
            this._grammar.add("root", "<line>*", () => [{ ini: this._ini }]);
        }
        
        public static read(input: string): IIni
        {
            if (this._grammar == null)
                this.initialize();
            
            this._ini = {};
            this._currentScope = this._ini;

            return this._grammar.scan("root", input).branches[0].ini;
        }
    }
}