export const isEmpty = (value: any) => {
    return (
        value === null ||
        value === "" ||
        value === undefined ||
        (value.hasOwnProperty("length") && value.length === 0) ||
        (typeof value === "object" && Object.keys(value).length === 0)
    )
}