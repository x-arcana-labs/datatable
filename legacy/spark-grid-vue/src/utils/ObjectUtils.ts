export const getValue = (object: any, path: string, separator: string = '.') => {
    return path
        .split(separator)
        .reduce((acc, part) => acc && acc[part], object);
}
