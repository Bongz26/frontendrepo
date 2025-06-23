export const calculateETC = (category, activeOrdersCount) => {
    if (!category || activeOrdersCount === undefined) {
        console.warn("🚨 Missing category or activeOrdersCount in ETC calculation!");
        return "N/A"; // ✅ Return fallback instead of undefined
    }

    const baseTime = category === "New Mix" ? 30 : category === "Reorder Mix" ? 20 : 15;
    const dynamicTime = baseTime + (activeOrdersCount * 2); // ✅ Adjust based on queue size

    return `${dynamicTime} mins`; // ✅ Ensure a valid string
};