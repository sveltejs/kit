
export async function get({ params }) {
    const slug = params.slug.split('/');
    const extension = slug[0].split('.').pop();
    console.log(extension);
    const examples = {
        png: 'https://repository-images.githubusercontent.com/354583933/72c58c80-9727-11eb-98b2-f352fded32b9',
        jpg: 'https://upload.wikimedia.org/wikipedia/commons/b/b2/JPEG_compression_Example.jpg'
    };
	const response = await fetch(examples[extension] || examples.png);
        const blob = await response.blob();
        const buffer = Buffer.from(await blob.arrayBuffer());
		return  {
            status: 200,
            headers: {
                'Content-Type': response.headers.get('content-type')
            },
            body: buffer
        };
}
