import * as assert from 'uvu/assert';
import { FormData, File } from "formdata-node"

/** @type {import('test').TestMaker} */
export default function (test) {
    test('handles single file upload', null, async ({ fetch }) => {

        const file1 = new File(["Lorem ipsum dolor sit amet"], "file1.txt");

        const formData = new FormData();

        formData.append('file1', file1, 'file1.txt');

        const response = await fetch('/file-upload/single-file-upload', {
            method: 'POST',
            //@ts-ignore
            body: formData
        });

        const data = await response.json();

        assert.equal(data, { filename: 'file1.txt' });
    });

    test('handles multiple file uploads', null, async ({ fetch }) => {

        const file1 = new File(["Lorem ipsum dolor sit amet"], "file1.txt");
        const file2 = new File(["Lorem ipsum dolor sit amet."], "file2.txt");

        const formData = new FormData();

        formData.append('files[]', file1, 'file1.txt');
        formData.append('files[]', file2, 'file2.txt');

        const response = await fetch('/file-upload/multi-file-upload', {
            method: 'POST',
            //@ts-ignore
            body: formData
        });

        /** @type {any} */
        const data = await response.json();

        assert.equal(data.filenames, ['file1.txt', 'file2.txt']);
    });
}

