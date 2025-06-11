// Function to generate date ranges for each month from 2016 to 2025
export function generateDateRanges(): Array<{
    startDate: string;
    endDate: string;
    year: number;
    month: number;
}> {
    const dateRanges: Array<{
        startDate: string;
        endDate: string;
        year: number;
        month: number;
    }> = [];
    const startYear = 2023;
    const endYear = 2025;

    for (let year = startYear; year <= endYear; year++) {
        for (let month = 0; month < 12; month++) {
            // Calculate the first day of the month
            const firstDay = new Date(year, month, 1);
            // Calculate the last day of the month
            const lastDay = new Date(year, month + 1, 0);

            // Format dates as DD-MM-YYYY
            const formatDate = (date: Date) => {
                const day = String(date.getDate()).padStart(2, "0");
                const monthStr = String(date.getMonth() + 1).padStart(2, "0");
                return `${day}-${monthStr}-${date.getFullYear()}`;
            };

            dateRanges.push({
                startDate: formatDate(firstDay),
                endDate: formatDate(lastDay),
                year: year,
                month: month + 1,
            });
        }
    }

    return dateRanges;
}