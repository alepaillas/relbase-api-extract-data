import * as XLSX from "xlsx";
import type { Customer, CustomerResponse } from "./types/customer.ts";
import type { City, CityResponse } from "./types/city.ts";
import type { Commune, CommuneResponse } from "./types/commune.ts";
import type { Seller, SellersResponse } from "./types/seller.ts";
import type {
  PaymentType,
  PaymentTypesResponse,
} from "./types/payment_type.ts";
import type { User, UsersResponse } from "./types/user.ts";
import type {
  Dte,
  DteChild,
  DteDetail,
  DteDetailResponse,
  DteListResponse,
} from "./types/dte.ts";
import { base_url, headers } from "./utils/dotenv.ts";
import { fetchSellerNameFromPrint } from "./services/print.ts";

// Cache for storing fetched data to avoid duplicate requests
const cache: {
  customers: Map<number, Customer>;
  cities: Map<number, City>;
  communes: Map<number, Commune>;
  sellers: Map<number, Seller>;
  paymentTypes: Map<number, PaymentType>;
  users: Map<number, User>;
} = {
  customers: new Map(),
  cities: new Map(),
  communes: new Map(),
  sellers: new Map(),
  paymentTypes: new Map(),
  users: new Map(),
};

// Function to generate date ranges for each month from 2016 to 2025
function generateDateRanges(): Array<{
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

// Fetch a single page of DTEs
async function fetchPage(
  page: number,
  typeDocument: string,
  startDate: string,
  endDate: string
): Promise<DteListResponse> {
  try {
    const url = new URL(`${base_url}/dtes`);
    url.searchParams.append("page", page.toString());
    url.searchParams.append("type_document", typeDocument);
    url.searchParams.append("range_date", `${startDate} / ${endDate}`);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(
      `Error fetching data for page ${page} (${startDate} to ${endDate}):`,
      error
    );
    throw error;
  }
}

// Fetch details for a specific DTE
async function fetchDteDetails(dteId: number): Promise<DteDetail | undefined> {
  try {
    const url = `${base_url}/dtes/${dteId}`;
    const response = await fetch(url, {
      method: "GET",
      headers: headers,
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`DTE ${dteId} not found`);
        return undefined;
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: DteDetailResponse = await response.json();

    // If seller_id exists but seller isn't in cache, try to get seller name from print endpoint
    if (data.data.seller_id && !cache.sellers.has(data.data.seller_id)) {
      const sellerName = await fetchSellerNameFromPrint(dteId);
      if (sellerName) {
        // Create a temporary seller object with just the name
        const tempSeller: Seller = {
          id: data.data.seller_id,
          first_name: sellerName.split(" ")[0] || "",
          last_name: sellerName.split(" ").slice(1).join(" ") || "",
          role: null,
          profile_id: null,
        };
        cache.sellers.set(data.data.seller_id, tempSeller);
      }
    }

    return data.data;
  } catch (error) {
    console.error(`Error fetching details for DTE ${dteId}:`, error);
    return undefined;
  }
}

// Fetch customer data
async function fetchCustomer(
  customerId: number
): Promise<Customer | undefined> {
  if (cache.customers.has(customerId)) {
    return cache.customers.get(customerId);
  }

  try {
    const url = `${base_url}/clientes/${customerId}`;
    const response = await fetch(url, {
      method: "GET",
      headers: headers,
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`Customer ${customerId} not found`);
        return undefined;
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: CustomerResponse = await response.json();
    cache.customers.set(customerId, data.data);
    return data.data;
  } catch (error) {
    console.error(`Error fetching customer ${customerId}:`, error);
    return undefined;
  }
}

// Fetch city data
async function fetchCity(cityId: number): Promise<City | undefined> {
  if (cache.cities.has(cityId)) {
    return cache.cities.get(cityId);
  }

  try {
    const url = `${base_url}/ciudades/${cityId}`;
    const response = await fetch(url, {
      method: "GET",
      headers: headers,
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`City ${cityId} not found`);
        return undefined;
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: CityResponse = await response.json();
    cache.cities.set(cityId, data.data);
    return data.data;
  } catch (error) {
    console.error(`Error fetching city ${cityId}:`, error);
    return undefined;
  }
}

// Fetch commune data
async function fetchCommune(communeId: number): Promise<Commune | undefined> {
  if (cache.communes.has(communeId)) {
    return cache.communes.get(communeId);
  }

  try {
    const url = `${base_url}/comunas/${communeId}`;
    const response = await fetch(url, {
      method: "GET",
      headers: headers,
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`Commune ${communeId} not found`);
        return undefined;
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: CommuneResponse = await response.json();
    cache.communes.set(communeId, data.data);
    return data.data;
  } catch (error) {
    console.error(`Error fetching commune ${communeId}:`, error);
    return undefined;
  }
}

// Fetch all sellers
async function fetchAllSellers(): Promise<Map<number, Seller>> {
  if (cache.sellers.size > 0) {
    return cache.sellers;
  }

  try {
    const url = `${base_url}/vendedores`;
    const response = await fetch(url, {
      method: "GET",
      headers: headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: SellersResponse = await response.json();
    data.data.sellers.forEach((seller) => {
      cache.sellers.set(seller.id, seller);
    });
    return cache.sellers;
  } catch (error) {
    console.error("Error fetching all sellers:", error);
    return cache.sellers;
  }
}

// Fetch all payment types
async function fetchAllPaymentTypes(): Promise<Map<number, PaymentType>> {
  if (cache.paymentTypes.size > 0) {
    return cache.paymentTypes;
  }

  try {
    const url = `${base_url}/forma_pagos`;
    const response = await fetch(url, {
      method: "GET",
      headers: headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: PaymentTypesResponse = await response.json();
    data.data.type_payments.forEach((paymentType) => {
      cache.paymentTypes.set(paymentType.id, paymentType);
    });
    return cache.paymentTypes;
  } catch (error) {
    console.error("Error fetching all payment types:", error);
    return cache.paymentTypes;
  }
}

// Fetch all users
async function fetchAllUsers(): Promise<Map<number, User>> {
  if (cache.users.size > 0) {
    return cache.users;
  }

  try {
    const url = `${base_url}/usuarios`;
    const response = await fetch(url, {
      method: "GET",
      headers: headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: UsersResponse = await response.json();
    data.data.users.forEach((user) => {
      cache.users.set(user.id, user);
    });
    return cache.users;
  } catch (error) {
    console.error("Error fetching all users:", error);
    return cache.users;
  }
}

// Fetch all pages of DTEs for a specific date range
async function fetchAllPages(
  typeDocument: string,
  startDate: string,
  endDate: string
): Promise<Dte[]> {
  let allData: Dte[] = [];
  let currentPage = 1;
  let totalPages = 1;

  try {
    // First fetch to get total pages
    const firstResponse = await fetchPage(
      currentPage,
      typeDocument,
      startDate,
      endDate
    );
    allData = allData.concat(firstResponse.data.dtes);
    totalPages = firstResponse.meta.total_pages;

    // If there are more pages, fetch them
    if (totalPages > 1) {
      const remainingPages = Array.from(
        { length: totalPages - 1 },
        (_, i) => i + 2
      );
      const pagePromises = remainingPages.map((page) =>
        fetchPage(page, typeDocument, startDate, endDate)
          .then((response) => response.data.dtes)
          .catch((error) => {
            console.error(`Error fetching page ${page}:`, error);
            return [] as Dte[];
          })
      );

      const results = await Promise.all(pagePromises);
      allData = allData.concat(...results);
    }

    return allData;
  } catch (error) {
    console.error(
      `Error fetching all pages (${startDate} to ${endDate}):`,
      error
    );
    return [];
  }
}

// Fetch all DTEs with their details for a specific date range
async function fetchAllDtesWithDetails(
  typeDocument: string,
  startDate: string,
  endDate: string
): Promise<
  Array<
    Dte & {
      details?: DteDetail;
      customer?: Customer;
      city?: City;
      commune?: Commune;
      seller?: Seller;
      payment_type?: PaymentType;
      user?: User;
    }
  >
> {
  try {
    // Pre-fetch all reference data
    await Promise.all([
      fetchAllSellers(),
      fetchAllPaymentTypes(),
      fetchAllUsers(),
    ]);

    const dtes = await fetchAllPages(typeDocument, startDate, endDate);

    // Fetch details for each DTE with a delay to avoid rate limiting
    const dtesWithDetails = await Promise.all(
      dtes.map(async (dte, index) => {
        try {
          // Add a small delay between requests to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, index * 1000));

          // Fetch DTE details (which now includes seller name from print endpoint if needed)
          const details = await fetchDteDetails(dte.id);

          // Fetch related data in parallel
          const [customer, city, commune, seller, paymentType, user] =
            await Promise.all([
              dte.customer_id
                ? fetchCustomer(dte.customer_id)
                : Promise.resolve(undefined),
              dte.city_id ? fetchCity(dte.city_id) : Promise.resolve(undefined),
              dte.commune_id
                ? fetchCommune(dte.commune_id)
                : Promise.resolve(undefined),
              dte.seller_id
                ? Promise.resolve(cache.sellers.get(dte.seller_id))
                : Promise.resolve(undefined),
              dte.type_payment_id
                ? Promise.resolve(cache.paymentTypes.get(dte.type_payment_id))
                : Promise.resolve(undefined),
              dte.user_id
                ? Promise.resolve(cache.users.get(dte.user_id))
                : Promise.resolve(undefined),
            ]);

          return {
            ...dte,
            details,
            customer,
            city,
            commune,
            seller,
            payment_type: paymentType,
            user,
          };
        } catch (error) {
          console.error(
            `Error fetching details for DTE ${dte.id} (${startDate} to ${endDate}):`,
            error
          );
          return {
            ...dte,
            details: undefined,
            customer: undefined,
            city: undefined,
            commune: undefined,
            seller: undefined,
            payment_type: undefined,
            user: undefined,
          };
        }
      })
    );

    return dtesWithDetails.filter((dte) => dte !== undefined) as Array<
      Dte & {
        details?: DteDetail;
        customer?: Customer;
        city?: City;
        commune?: Commune;
        seller?: Seller;
        payment_type?: PaymentType;
        user?: User;
      }
    >;
  } catch (error) {
    console.error(
      `Error fetching all DTEs with details (${startDate} to ${endDate}):`,
      error
    );
    return [];
  }
}

// Save data to Excel with multiple sheets
function saveToExcel(
  data: Array<
    Dte & {
      details?: DteDetail;
      customer?: Customer;
      city?: City;
      commune?: Commune;
      seller?: Seller;
      payment_type?: PaymentType;
      user?: User;
    }
  >,
  fileName: string
): void {
  const workbook = XLSX.utils.book_new();

  // Create main DTEs sheet with all fields
  const dtesSheet = XLSX.utils.json_to_sheet(
    data.map((dte) => ({
      id: dte.id,
      folio: dte.folio,
      type_document: dte.type_document,
      iva: dte.iva,
      type_document_name: dte.type_document_name,
      sii_status: dte.sii_status,
      sii_status_name: dte.sii_status_name,
      start_date: dte.start_date,
      end_date: dte.end_date,
      pdf_file: dte.pdf_file.url,
      xml_inter_file: dte.xml_inter_file.url,
      customer_id: dte.customer_id,
      customer_name: dte.customer?.name,
      customer_rut: dte.customer?.rut,
      customer_type: dte.customer?.type_customer,
      commune_id: dte.commune_id,
      commune_name: dte.commune?.name,
      city_id: dte.city_id,
      city_name: dte.city?.name,
      address: dte.address,
      type_transfer: dte.type_transfer,
      global_discount: dte.global_discount,
      contact: dte.contact,
      channel_id: dte.channel_id,
      type_payment_id: dte.type_payment_id,
      payment_type_name: dte.payment_type?.name,
      seller_id: dte.seller_id,
      seller_name: dte.seller
        ? `${dte.seller.first_name} ${dte.seller.last_name}`
        : undefined,
      label_value: dte.label_value,
      status: dte.status,
      comment: dte.comment,
      created_at: dte.created_at,
      updated_at: dte.updated_at,
      type_option_ref: dte.type_option_ref,
      track_id: dte.track_id,
      user_id: dte.user_id,
      user_name: dte.user
        ? `${dte.user.first_name} ${dte.user.last_name}`
        : undefined,
      is_load_xml: dte.is_load_xml,
      is_manual: dte.is_manual,
      amount_iva: dte.amount_iva,
      amount_total: dte.amount_total,
      amount_neto: dte.amount_neto,
      amount_tax: dte.amount_tax,
      amount_exempt: dte.amount_exempt,
      unit_cost: dte.unit_cost,
      real_amount_total: dte.real_amount_total,
      real_amount_neto: dte.real_amount_neto,
      real_amount_iva: dte.real_amount_iva,
      real_amount_tax: dte.real_amount_tax,
      real_amount_exempt: dte.real_amount_exempt,
      cash_sale: dte.cash_sale,
      mnt_bruto: dte.mnt_bruto,
      dispatch_address: dte.dispatch_address,
      dispatch_city_id: dte.dispatch_city_id,
      dispatch_commune_id: dte.dispatch_commune_id,
      number_plate: dte.number_plate,
      shipper_rut: dte.shipper_rut,
      driver_rut: dte.driver_rut,
      driver_name: dte.driver_name,
      branch_id: dte.branch_id,
      continuous: dte.continuous,
      addon_centry: dte.addon_centry,
      ware_house_id: dte.ware_house_id,
      change_due: dte.change_due,
      amount_paid: dte.amount_paid,
      logo_propyme: dte.logo_propyme,
      currency: dte.currency,
      type_document_sii: dte.type_document_sii,
      is_stock_sale_note: dte.is_stock_sale_note,
      addon_ecommerce: dte.addon_ecommerce,
      income_type: dte.income_type,
      reject_date: dte.reject_date,
      tpo_tran_venta: dte.tpo_tran_venta,
      tpo_tran_compra: dte.tpo_tran_compra,
      str_commune: dte.str_commune,
      str_city: dte.str_city,
      is_str_address: dte.is_str_address,
      timbre: dte.timbre,
    }))
  );
  XLSX.utils.book_append_sheet(workbook, dtesSheet, "DTEs");

  // Create products sheet with all fields
  const products = data.flatMap((dte) =>
    (dte.details?.products || []).map((product) => ({
      dte_id: dte.id,
      dte_folio: dte.folio,
      product_id: product.product_id,
      name: product.name,
      url_image: product.url_image,
      price: product.price,
      quantity: product.quantity,
      description: product.description,
      discount: product.discount,
      surcharge: product.surcharge,
      unit_item: product.unit_item,
      code: product.code,
      tax_affected: product.tax_affected,
      created_at: product.created_at,
      updated_at: product.updated_at,
      additional_tax_code: product.additional_tax_code,
      additional_tax_fee: product.additional_tax_fee,
      unit_cost: product.unit_cost,
      real_quantity: product.real_quantity,
      real_amount_neto: product.real_amount_neto,
      is_profit: product.is_profit,
      expiration_date: product.expiration_date,
      lot_serial_number_id: product.lot_serial_number_id,
      lot_serial_number: product.lot_serial_number,
      traceability: product.traceability,
    }))
  );

  if (products.length > 0) {
    const productsSheet = XLSX.utils.json_to_sheet(products);
    XLSX.utils.book_append_sheet(workbook, productsSheet, "Products");
  }

  // Create emails sheet with all fields
  const emails = data.flatMap((dte) =>
    (dte.details?.emails || []).map((email) => ({
      dte_id: dte.id,
      dte_folio: dte.folio,
      id: email.id,
      e_document_id: email.e_document_id,
      email: email.email,
      created_at: email.created_at,
      updated_at: email.updated_at,
      message: email.message,
      subject: email.subject,
      reminder_id: email.reminder_id,
      company_id: email.company_id,
      business_id: email.business_id,
    }))
  );

  if (emails.length > 0) {
    const emailsSheet = XLSX.utils.json_to_sheet(emails);
    XLSX.utils.book_append_sheet(workbook, emailsSheet, "Emails");
  }

  // Create SII tracks sheet with all fields
  const siiTracks = data.flatMap((dte) =>
    (dte.details?.sii_tracks || []).map((track) => ({
      dte_id: dte.id,
      dte_folio: dte.folio,
      sii_status: track.sii_status,
      note: track.note,
      ws_status: track.ws_status,
      created_at: track.created_at,
      updated_at: track.updated_at,
    }))
  );

  if (siiTracks.length > 0) {
    const siiTracksSheet = XLSX.utils.json_to_sheet(siiTracks);
    XLSX.utils.book_append_sheet(workbook, siiTracksSheet, "SII_Tracks");
  }

  // Create DTE children sheet with all fields
  const dteChildren = data.flatMap((dte) =>
    (dte.details?.dte_children || []).map((child) => ({
      dte_id: dte.id,
      dte_folio: dte.folio,
      id: child.id,
      folio: child.folio,
      type_document: child.type_document,
      type_document_name: child.type_document_name,
    }))
  );

  if (dteChildren.length > 0) {
    const dteChildrenSheet = XLSX.utils.json_to_sheet(dteChildren);
    XLSX.utils.book_append_sheet(workbook, dteChildrenSheet, "DTE_Children");
  }

  // Create Customers sheet
  const customers = Array.from(cache.customers.values()).map((customer) => ({
    id: customer.id,
    type_customer: customer.type_customer,
    rut: customer.rut,
    name: customer.name,
    name_fantasy: customer.name_fantasy,
    address: customer.address,
    business_activity: customer.business_activity,
    city_id: customer.city_id,
    commune_id: customer.commune_id,
    active: customer.active,
    code: customer.code,
    name_payment: customer.name_payment,
    phone_payment: customer.phone_payment,
    email: customer.email.join("; "),
    business_contact: customer.business_contact,
    email_commercial: customer.email_commercial.join("; "),
    phone: customer.phone,
    mobile: customer.mobile,
    reference: customer.reference,
    discount: customer.discount,
    credit: customer.credit,
    type_payment_id: customer.type_payment_id,
    credit_amount: customer.credit_amount,
    is_overdue_invoice: customer.is_overdue_invoice,
    days_overdue: customer.days_overdue,
    price_list_id: customer.price_list_id,
    price_list_name: customer.price_list_name,
    is_price_list_default: customer.is_price_list_default,
    full_address: customer.full_address,
  }));

  if (customers.length > 0) {
    const customersSheet = XLSX.utils.json_to_sheet(customers);
    XLSX.utils.book_append_sheet(workbook, customersSheet, "Customers");
  }

  // Create Cities sheet
  const cities = Array.from(cache.cities.values()).map((city) => ({
    id: city.id,
    name: city.name,
  }));

  if (cities.length > 0) {
    const citiesSheet = XLSX.utils.json_to_sheet(cities);
    XLSX.utils.book_append_sheet(workbook, citiesSheet, "Cities");
  }

  // Create Communes sheet
  const communes = Array.from(cache.communes.values()).map((commune) => ({
    id: commune.id,
    name: commune.name,
    city_id: commune.city_id,
  }));

  if (communes.length > 0) {
    const communesSheet = XLSX.utils.json_to_sheet(communes);
    XLSX.utils.book_append_sheet(workbook, communesSheet, "Communes");
  }

  // Create Sellers sheet
  const sellers = Array.from(cache.sellers.values()).map((seller) => ({
    id: seller.id,
    first_name: seller.first_name,
    last_name: seller.last_name,
    role: seller.role,
    profile_id: seller.profile_id,
  }));

  if (sellers.length > 0) {
    const sellersSheet = XLSX.utils.json_to_sheet(sellers);
    XLSX.utils.book_append_sheet(workbook, sellersSheet, "Sellers");
  }

  // Create Payment Types sheet
  const paymentTypes = Array.from(cache.paymentTypes.values()).map(
    (paymentType) => ({
      id: paymentType.id,
      name: paymentType.name,
      fma_pago_sii: paymentType.fma_pago_sii,
      kind_payment: paymentType.kind_payment,
      enabled: paymentType.enabled,
    })
  );

  if (paymentTypes.length > 0) {
    const paymentTypesSheet = XLSX.utils.json_to_sheet(paymentTypes);
    XLSX.utils.book_append_sheet(workbook, paymentTypesSheet, "Payment_Types");
  }

  // Create Users sheet
  const users = Array.from(cache.users.values()).map((user) => ({
    id: user.id,
    branch_id: user.branch_id,
    first_name: user.first_name,
    last_name: user.last_name,
    role: user.role,
    email: user.email,
    token: user.token,
    ware_house_id: user.ware_house_id,
    seller_id: user.seller_id,
    channel_id: user.channel_id,
    type_document_sii: user.type_document_sii,
    type_document_sn: user.type_document_sn,
    type_payment_id: user.type_payment_id,
    type_print_pos: user.type_print_pos,
    ticket: user.ticket,
    is_income_paid: user.is_income_paid,
    comment_estimate: user.comment_estimate,
    comment_sales_note: user.comment_sales_note,
    comment_dte: user.comment_dte,
    charset_id: user.charset_id,
    charset_name: user.charset_name,
    is_mnt_bruto_estimate: user.is_mnt_bruto_estimate,
    ware_house_web_id: user.ware_house_web_id,
    is_owner_warehouse: user.is_owner_warehouse,
  }));

  if (users.length > 0) {
    const usersSheet = XLSX.utils.json_to_sheet(users);
    XLSX.utils.book_append_sheet(workbook, usersSheet, "Users");
  }

  // Write the workbook to a file
  XLSX.writeFile(workbook, fileName);
  console.log(`Data saved to ${fileName}`);
}

// Main function to process all date ranges
async function processAllDateRanges() {
  const dateRanges = generateDateRanges();
  const typeDocument = "33"; // Document type 33 (Factura Electrónica)

  // Process each date range
  for (const range of dateRanges) {
    try {
      console.log(
        `Processing date range: ${range.startDate} to ${range.endDate}`
      );

      const data = await fetchAllDtesWithDetails(
        typeDocument,
        range.startDate,
        range.endDate
      );

      if (data.length > 0) {
        const fileName = `./data/dtes_type${typeDocument}_${
          range.year
        }_${String(range.month).padStart(2, "0")}.xlsx`;
        saveToExcel(data, fileName);
        console.log(`Saved ${data.length} records to ${fileName}`);
      } else {
        console.log(
          `No data found for range ${range.startDate} to ${range.endDate}`
        );
      }

      // Add delay between date ranges to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(
        `Error processing date range ${range.startDate} to ${range.endDate}:`,
        error
      );
    }
  }
}

// Start processing all date ranges
processAllDateRanges().catch((error) => {
  console.error("Error in processAllDateRanges:", error);
});
