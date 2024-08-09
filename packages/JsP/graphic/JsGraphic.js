export function ResizeImage(image, width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0, width, height);

    // Ritorna il data URL dell'immagine ridimensionata
    return canvas.toDataURL();
}

export {
    ResizeImage,
};
