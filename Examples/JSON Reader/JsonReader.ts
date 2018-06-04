///<reference path="../../Source/Grammar.ts"/>

namespace Abitvin
{
    interface IScanContext
    {
        prop?: string;
        value?: any;
    }
    
    export class JsonReader
    {
        private static _grammar: Grammar<IScanContext, void>;
        
        public static initialize(): void
        {
            this._grammar = new Grammar<IScanContext, void>();

            this._grammar.add("0", "0");
            this._grammar.add("non0", "[1-9]");
            this._grammar.add("dec", "[0-9]");
            this._grammar.add("oct", "[0-7]");
            this._grammar.add("af", "[a-f]");
            this._grammar.add("AF", "[A-F]");
            this._grammar.add("letter", "[a-z]");
            this._grammar.add("LETTER", "[A-Z]");
            this._grammar.add("hex", "(<dec>|<af>|<AF>)");
            this._grammar.add("alpha-num", "(<letter>|<LETTER>|<dec>)");

            this._grammar.declare("value");

            // Boolean
            const parseBoolFn = (b, l) => [{ value: l === "true" }];
            this._grammar.add("bool", "(true|false)", parseBoolFn);
            
            // Null
            const parseNullFn = (b, l) => [{ value: null }];
            this._grammar.add("null", "null", parseNullFn);
            
            // Undefined
            const parseUndefinedFn = (b, l) => [{ value: undefined }];
            this._grammar.add("undefined", "undefined", parseUndefinedFn);
            
            // Number
            const parseHexFn = (b, l) => [{ value: parseInt(l.substr(2), 16) }];
            const parseOctFn = (b, l) => [{ value: parseInt(l.substr(1), 8) }];
            const parseFloatFn = (b, l) => [{ value: parseFloat(l) }];
            
            this._grammar.add("non0-signed-int", "-?<non0><dec>*");
            this._grammar.add("signed-int", "(<0>|<non0-signed-int>)");
            this._grammar.add("fraction", "\\.<dec>+");
            this._grammar.add("hex-num", "0x<hex>+", parseHexFn);
            this._grammar.add("oct-num", "0<oct>+", parseOctFn);
            this._grammar.add("dec-num", "<signed-int><fraction>?", parseFloatFn);
            this._grammar.add("decfrac-num", "\\.<dec>+", parseFloatFn);
            
            // String
            const combineCharsFn = (b, l) => [{ value: b.map(i => i.value).join("") }];
            const emptyStrFn = (b, l) => [{ value: "" }];
            const parseCharCodeFn = (b, l) => [{ value: String.fromCharCode(parseInt(l.substr(2), 16)) }];
            const passLexemeFn = (b, l) => [{ value: l }];
            
            this._grammar.add("str-esc-control", "(~\\\\0,\\0|\\\\b,\\b|\\\\f,\\f|\\\\n,\\n|\\\\r,\\r|\\\\t,\\t|\\\\v,\\v|\\\",\")", passLexemeFn); // Escape character hell over here, move along...
            this._grammar.add("str-escape-latin1", "\\\\x<hex>{2}", parseCharCodeFn);
            this._grammar.add("str-escape-utf16", "\\\\u<hex>{4}", parseCharCodeFn);
            this._grammar.add("str-escape-unknown", "\\\\", passLexemeFn);
            this._grammar.add("str-all-except-bs", "[^\"]", passLexemeFn);
            this._grammar.add("str-char", "(<str-esc-control>|<str-escape-latin1>|<str-escape-utf16>|<str-escape-unknown>|<str-all-except-bs>)");
            this._grammar.add("str-value", "<str-char>*", combineCharsFn);
            this._grammar.add("str-empty", "\"\"", emptyStrFn);
            this._grammar.add("str", "(<str-empty>|\"<str-value>\")");
            
            // Array
            const parseArrayFn = (b, l) => [{ value: b.map(i => i.value) }];
            
            this._grammar.add("arr-item", ", <value> ");
            this._grammar.add("arr-items", "<value> <arr-item>*,?");
            this._grammar.add("arr", "\\[ <arr-items>? \\]", parseArrayFn);
            
            // Object
            const parsePropNameFn = (b, l) => [{ prop: l }];
            const parsePropFn = (b, l) => [{ prop: b[0].prop, value: b[1].value }];
            
            const parseObjFn = (b, l) =>
            {
                const obj = {};
                b.forEach(i => obj[i.prop] = i.value);
                return [{ value: obj }];
            };
            
            this._grammar.add("varname", "(<letter>|<LETTER>)<alpha-num>*");   // Note that this is not the full range of allowed characters in JavaScript variables.
            this._grammar.add("obj-propname", "(<str>|<varname>)", parsePropNameFn);
            this._grammar.add("obj-prop", "<obj-propname> : <value>", parsePropFn);
            this._grammar.add("obj-item", ", <obj-prop> ");
            this._grammar.add("obj-items", "<obj-prop> <obj-item>*,?");
            this._grammar.add("obj", "\\{ <obj-items>? \\}", parseObjFn);
            
            this._grammar.add("value", " (<bool>|<null>|<undefined>|<hex-num>|<oct-num>|<dec-num>|<decfrac-num>|<str>|<arr>|<obj>) ");
        }
        
        public static read(input: string): RuleResult<IScanContext, void>
        {
            if (this._grammar == null)
                this.initialize();
            
            return this._grammar.scan("value", input);
        }
    }
}