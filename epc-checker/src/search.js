/** Fetch every domestic search page for a postcode. */
export async function fetchAllForPostcode(client, postcode, pageSize = 5000) {
  const rows = [];
  let currentPage = 1;
  let totalPages = 1;
  let pagination = null;

  while (currentPage <= totalPages) {
    const search = await client.searchDomestic({
      postcode,
      page_size: pageSize,
      current_page: currentPage,
    });
    const pageRows = Array.isArray(search.data) ? search.data : [];
    rows.push(...pageRows);
    pagination = search.pagination ?? pagination;
    totalPages = search.pagination?.totalPages ?? 1;
    if (!pageRows.length) break;
    currentPage += 1;
  }

  return { rows, pagination };
}
