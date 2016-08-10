// Copyright (c) 2016 Abitvin <foss@abitvin.net>
// Licensed under the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>
// This file may not be copied, modified, or distributed except according to those terms.

namespace Abitvin
{
    type AssertFn = (success: boolean) => void;
    type DoneFn = () => void;
    type TestFn = (assert: AssertFn, done: DoneFn) => void;

    export class Test
    {
        private _footRowEl: HTMLTableRowElement;
        private _tbodyEl: HTMLTableSectionElement;
        private _totalFailed: number;
        private _totalSuccess: number;

        constructor(name: string)
        {
            this._totalFailed = 0;
            this._totalSuccess = 0;

            const tableEl = document.createElement("table");
            tableEl.className = "unit-tests";
            document.body.appendChild(tableEl);

            // Caption
            const captionEl = document.createElement("caption");
            captionEl.textContent = name;
            tableEl.appendChild(captionEl);

            // Head
            let cellEl1 = document.createElement("td");
            let cellEl2 = document.createElement("th");
            let cellEl3 = document.createElement("th");
            let cellEl4 = document.createElement("th");
            cellEl2.textContent = "Success";
            cellEl3.textContent = "Failed";
            cellEl4.textContent = "Checks";
            
            const headRowEl = tableEl.createTHead().insertRow();
            headRowEl.appendChild(cellEl1);
            headRowEl.appendChild(cellEl2);
            headRowEl.appendChild(cellEl3);
            headRowEl.appendChild(cellEl4);

            // Body
            this._tbodyEl = tableEl.createTBody();
            
            // Foot
            cellEl1 = document.createElement("th");
            cellEl2 = document.createElement("td");
            cellEl3 = document.createElement("td");
            cellEl4 = document.createElement("td");

            cellEl1.textContent = "Total";
            cellEl2.className = "success";
            cellEl3.className = "failed";
            cellEl4.className = "checks";

            this._footRowEl = tableEl.createTFoot().insertRow();
            this._footRowEl.appendChild(cellEl1);
            this._footRowEl.appendChild(cellEl2);
            this._footRowEl.appendChild(cellEl3);
            this._footRowEl.appendChild(cellEl4);
        }

        public it(name: string, fn: TestFn): this
        {
            const rowEl = this._tbodyEl.insertRow();
            rowEl.classList.add("unit-test");
            rowEl.classList.add("running");

            const cellEl1 = document.createElement("th");
            const cellEl2 = document.createElement("td");
            const cellEl3 = document.createElement("td");
            const cellEl4 = document.createElement("td");

            cellEl1.textContent = name;
            cellEl2.setAttribute("data-success", "0");
            cellEl3.setAttribute("data-failed", "0");
            cellEl4.setAttribute("data-checks", "0");

            cellEl1.className = "name";
            cellEl2.className = "success";
            cellEl3.className = "failed";
            cellEl4.className = "checks";

            rowEl.appendChild(cellEl1);
            rowEl.appendChild(cellEl2);
            rowEl.appendChild(cellEl3);
            rowEl.appendChild(cellEl4);

            let failed = 0;
            let success = 0;

            const assertFn = (result) => {
                if (result)
                {
                    success++;
                    this._totalSuccess++;
                }
                else
                {
                    failed++;
                    this._totalFailed++;
                }

                cellEl2.setAttribute("data-success", `${success}`);
                cellEl3.setAttribute("data-failed", `${failed}`);
                cellEl4.setAttribute("data-checks", `${success + failed}`);
            };

            const doneFn = () => {
                rowEl.classList.remove("running");
                
                cellEl2.setAttribute("data-success", `${success}`);
                cellEl3.setAttribute("data-failed", `${failed}`);
                cellEl4.setAttribute("data-checks", `${success + failed}`);

                this._footRowEl.children[1].setAttribute("data-success", `${this._totalSuccess}`);
                this._footRowEl.children[2].setAttribute("data-failed", `${this._totalFailed}`);
                this._footRowEl.children[3].setAttribute("data-checks", `${this._totalFailed + this._totalSuccess}`);
            };

            try {
                fn(assertFn, doneFn);
            }
            catch(e) {
                console.error(e);
                failed++;
                doneFn();
            }

            return this;
        }
    }
}