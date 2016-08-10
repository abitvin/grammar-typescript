///<reference path="../../Source/Grammer.ts"/>

namespace Abitvin
{
    interface IScanContext
    {
        prop?: string;
        value?: any;
    }
    
    export class JsonReader
    {
        private static _grammer: Grammer<IScanContext, void>;
        
        public static initialize(): void
        {
            this._grammer = new Grammer<IScanContext, void>();

            this._grammer.add("0", "0");
            this._grammer.add("non0", "[1-9]");
            this._grammer.add("dec", "[0-9]");
            this._grammer.add("oct", "[0-7]");
            this._grammer.add("af", "[a-f]");
            this._grammer.add("AF", "[A-F]");
            this._grammer.add("letter", "[a-z]");
            this._grammer.add("LETTER", "[A-Z]");
            this._grammer.add("hex", "(<dec>|<af>|<AF>)");
            this._grammer.add("alpha-num", "(<letter>|<LETTER>|<dec>)");

            this._grammer.declare("value");

            // Boolean
            const parseBoolFn = (b, l) => [{ value: l === "true" }];
            this._grammer.add("bool", "(true|false)", parseBoolFn);
            
            // Null
            const parseNullFn = (b, l) => [{ value: null }];
            this._grammer.add("null", "null", parseNullFn);
            
            // Undefined
            const parseUndefinedFn = (b, l) => [{ value: undefined }];
            this._grammer.add("undefined", "undefined", parseUndefinedFn);
            
            // Number
            const parseHexFn = (b, l) => [{ value: parseInt(l.substr(2), 16) }];
            const parseOctFn = (b, l) => [{ value: parseInt(l.substr(1), 8) }];
            const parseFloatFn = (b, l) => [{ value: parseFloat(l) }];
            
            this._grammer.add("non0-signed-int", "-?<non0><dec>*");
            this._grammer.add("signed-int", "(<0>|<non0-signed-int>)");
            this._grammer.add("fraction", "\\.<dec>+");
            this._grammer.add("hex-num", "0x<hex>+", parseHexFn);
            this._grammer.add("oct-num", "0<oct>+", parseOctFn);
            this._grammer.add("dec-num", "<signed-int><fraction>?", parseFloatFn);
            this._grammer.add("decfrac-num", "\\.<dec>+", parseFloatFn);
            
            // String
            const combineCharsFn = (b, l) => [{ value: b.map(i => i.value).join("") }];
            const emptyStrFn = (b, l) => [{ value: "" }];
            const parseCharCodeFn = (b, l) => [{ value: String.fromCharCode(parseInt(l.substr(2), 16)) }];
            const passLexemeFn = (b, l) => [{ value: l }];
            
            this._grammer.add("str-esc-control", "(~\\\\0,\\0|\\\\b,\\b|\\\\f,\\f|\\\\n,\\n|\\\\r,\\r|\\\\t,\\t|\\\\v,\\v|\\\",\")", passLexemeFn); // Escape character hell over here, move along...
            this._grammer.add("str-escape-latin1", "\\\\x<hex>{2}", parseCharCodeFn);
            this._grammer.add("str-escape-utf16", "\\\\u<hex>{4}", parseCharCodeFn);
            this._grammer.add("str-escape-unknown", "\\\\", passLexemeFn);
            this._grammer.add("str-all-except-bs", "[^\"]", passLexemeFn);
            this._grammer.add("str-char", "(<str-esc-control>|<str-escape-latin1>|<str-escape-utf16>|<str-escape-unknown>|<str-all-except-bs>)");
            this._grammer.add("str-value", "<str-char>*", combineCharsFn);
            this._grammer.add("str-empty", "\"\"", emptyStrFn);
            this._grammer.add("str", "(<str-empty>|\"<str-value>\")");
            
            // Array
            const parseArrayFn = (b, l) => [{ value: b.map(i => i.value) }];
            
            this._grammer.add("arr-item", ", <value> ");
            this._grammer.add("arr-items", "<value> <arr-item>*,?");
            this._grammer.add("arr", "\\[ <arr-items>? \\]", parseArrayFn);
            
            // Object
            const parsePropNameFn = (b, l) => [{ prop: l }];
            const parsePropFn = (b, l) => [{ prop: b[0].prop, value: b[1].value }];
            
            const parseObjFn = (b, l) =>
            {
                const obj = {};
                b.forEach(i => obj[i.prop] = i.value);
                return [{ value: obj }];
            };
            
            this._grammer.add("varname", "(<letter>|<LETTER>)<alpha-num>*");   // Note that this is not the full range of allowed characters in JavaScript variables.
            this._grammer.add("obj-propname", "(<str>|<varname>)", parsePropNameFn);
            this._grammer.add("obj-prop", "<obj-propname> : <value>", parsePropFn);
            this._grammer.add("obj-item", ", <obj-prop> ");
            this._grammer.add("obj-items", "<obj-prop> <obj-item>*,?");
            this._grammer.add("obj", "\\{ <obj-items>? \\}", parseObjFn);
            
            this._grammer.add("value", " (<bool>|<null>|<undefined>|<hex-num>|<oct-num>|<dec-num>|<decfrac-num>|<str>|<arr>|<obj>) ");
        }
        
        public static read(input: string): RuleResult<IScanContext, void>
        {
            if (this._grammer == null)
                this.initialize();
            
            return this._grammer.scan("value", input);
        }
    }
}