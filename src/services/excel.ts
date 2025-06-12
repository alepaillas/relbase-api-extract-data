import * as XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";
import type { City } from "../types/city.ts";
import type { Commune } from "../types/commune.ts";
import type { Customer } from "../types/customer.ts";
import type { Dte, DteDetail } from "../types/dte.ts";
import type { PaymentType } from "../types/payment_type.ts";
import type { Seller } from "../types/seller.ts";
import type { User } from "../types/user.ts";
import { cache } from "../utils/cache.ts";

// Ensure the data directory exists
function ensureDataDirectory() {
    const dir = './data';
    if (!fs.existsSync(dir)) {
        console.log(`Creating directory: ${dir}`);
        fs.mkdirSync(dir, { recursive: true });
    }
}

// Save data to Excel with multiple sheets
export function saveToExcel(
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
    try {
        console.log(`[${new Date().toISOString()}] Starting to save data to Excel file: ${fileName}`);

        // Ensure the data directory exists
        ensureDataDirectory();

        const workbook = XLSX.utils.book_new();
        const startTime = Date.now();

        // Create main DTEs sheet with all fields
        console.log(`[${new Date().toISOString()}] Creating DTEs sheet with ${data.length} records`);
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
                pdf_file: dte.pdf_file?.url || '',
                xml_inter_file: dte.xml_inter_file?.url || '',
                customer_id: dte.customer_id,
                customer_name: dte.customer?.name || '',
                customer_rut: dte.customer?.rut || '',
                customer_type: dte.customer?.type_customer || '',
                commune_id: dte.commune_id,
                commune_name: dte.commune?.name || '',
                city_id: dte.city_id,
                city_name: dte.city?.name || '',
                address: dte.address || '',
                type_transfer: dte.type_transfer || '',
                global_discount: dte.global_discount || 0,
                contact: dte.contact || '',
                channel_id: dte.channel_id,
                type_payment_id: dte.type_payment_id,
                payment_type_name: dte.payment_type?.name || '',
                seller_id: dte.seller_id,
                seller_name: dte.seller
                    ? `${dte.seller.first_name} ${dte.seller.last_name}`
                    : '',
                label_value: dte.label_value || '',
                status: dte.status || '',
                comment: dte.comment || '',
                created_at: dte.created_at || '',
                updated_at: dte.updated_at || '',
                type_option_ref: dte.type_option_ref || '',
                track_id: dte.track_id || '',
                user_id: dte.user_id,
                user_name: dte.user
                    ? `${dte.user.first_name} ${dte.user.last_name}`
                    : '',
                is_load_xml: dte.is_load_xml,
                is_manual: dte.is_manual,
                amount_iva: dte.amount_iva || 0,
                amount_total: dte.amount_total || 0,
                amount_neto: dte.amount_neto || 0,
                amount_tax: dte.amount_tax || 0,
                amount_exempt: dte.amount_exempt || 0,
                unit_cost: dte.unit_cost || 0,
                real_amount_total: dte.real_amount_total || 0,
                real_amount_neto: dte.real_amount_neto || 0,
                real_amount_iva: dte.real_amount_iva || 0,
                real_amount_tax: dte.real_amount_tax || 0,
                real_amount_exempt: dte.real_amount_exempt || 0,
                cash_sale: dte.cash_sale || 0,
                mnt_bruto: dte.mnt_bruto,
                dispatch_address: dte.dispatch_address || '',
                dispatch_city_id: dte.dispatch_city_id,
                dispatch_commune_id: dte.dispatch_commune_id,
                number_plate: dte.number_plate || '',
                shipper_rut: dte.shipper_rut || '',
                driver_rut: dte.driver_rut || '',
                driver_name: dte.driver_name || '',
                branch_id: dte.branch_id,
                continuous: dte.continuous,
                addon_centry: dte.addon_centry,
                ware_house_id: dte.ware_house_id,
                change_due: dte.change_due || 0,
                amount_paid: dte.amount_paid || 0,
                logo_propyme: dte.logo_propyme,
                currency: dte.currency || '',
                type_document_sii: dte.type_document_sii || '',
                is_stock_sale_note: dte.is_stock_sale_note,
                addon_ecommerce: dte.addon_ecommerce,
                income_type: dte.income_type || 0,
                reject_date: dte.reject_date || '',
                tpo_tran_venta: dte.tpo_tran_venta || '',
                tpo_tran_compra: dte.tpo_tran_compra || '',
                str_commune: dte.str_commune || '',
                str_city: dte.str_city || '',
                is_str_address: dte.is_str_address,
                timbre: dte.timbre || '',
            }))
        );
        XLSX.utils.book_append_sheet(workbook, dtesSheet, "DTEs");
        console.log(`[${new Date().toISOString()}] Created DTEs sheet successfully`);

        // Create products sheet with all fields
        const products = data.flatMap((dte) =>
            (dte.details?.products || []).map((product) => ({
                dte_id: dte.id,
                dte_folio: dte.folio,
                product_id: product.product_id,
                name: product.name || '',
                url_image: product.url_image || '',
                price: product.price || 0,
                quantity: product.quantity || 0,
                description: product.description || '',
                discount: product.discount || 0,
                surcharge: product.surcharge || 0,
                unit_item: product.unit_item || '',
                code: product.code || '',
                tax_affected: product.tax_affected,
                created_at: product.created_at || '',
                updated_at: product.updated_at || '',
                additional_tax_code: product.additional_tax_code || '',
                additional_tax_fee: product.additional_tax_fee || 0,
                unit_cost: product.unit_cost || 0,
                real_quantity: product.real_quantity || 0,
                real_amount_neto: product.real_amount_neto || 0,
                is_profit: product.is_profit,
                expiration_date: product.expiration_date || '',
                lot_serial_number_id: product.lot_serial_number_id || 0,
                lot_serial_number: product.lot_serial_number || '',
                traceability: product.traceability || '',
            }))
        );

        if (products.length > 0) {
            console.log(`[${new Date().toISOString()}] Creating Products sheet with ${products.length} records`);
            const productsSheet = XLSX.utils.json_to_sheet(products);
            XLSX.utils.book_append_sheet(workbook, productsSheet, "Products");
            console.log(`[${new Date().toISOString()}] Created Products sheet successfully`);
        }

        // Create emails sheet with all fields
        const emails = data.flatMap((dte) =>
            (dte.details?.emails || []).map((email) => ({
                dte_id: dte.id,
                dte_folio: dte.folio,
                id: email.id,
                e_document_id: email.e_document_id,
                email: email.email || '',
                created_at: email.created_at || '',
                updated_at: email.updated_at || '',
                message: email.message || '',
                subject: email.subject || '',
                reminder_id: email.reminder_id || 0,
                company_id: email.company_id || 0,
                business_id: email.business_id || 0,
            }))
        );

        if (emails.length > 0) {
            console.log(`[${new Date().toISOString()}] Creating Emails sheet with ${emails.length} records`);
            const emailsSheet = XLSX.utils.json_to_sheet(emails);
            XLSX.utils.book_append_sheet(workbook, emailsSheet, "Emails");
            console.log(`[${new Date().toISOString()}] Created Emails sheet successfully`);
        }

        // Create SII tracks sheet with all fields
        const siiTracks = data.flatMap((dte) =>
            (dte.details?.sii_tracks || []).map((track) => ({
                dte_id: dte.id,
                dte_folio: dte.folio,
                sii_status: track.sii_status || '',
                note: track.note || '',
                ws_status: track.ws_status || '',
                created_at: track.created_at || '',
                updated_at: track.updated_at || '',
            }))
        );

        if (siiTracks.length > 0) {
            console.log(`[${new Date().toISOString()}] Creating SII_Tracks sheet with ${siiTracks.length} records`);
            const siiTracksSheet = XLSX.utils.json_to_sheet(siiTracks);
            XLSX.utils.book_append_sheet(workbook, siiTracksSheet, "SII_Tracks");
            console.log(`[${new Date().toISOString()}] Created SII_Tracks sheet successfully`);
        }

        // Create DTE children sheet with all fields
        const dteChildren = data.flatMap((dte) =>
            (dte.details?.dte_children || []).map((child) => ({
                dte_id: dte.id,
                dte_folio: dte.folio,
                id: child.id,
                folio: child.folio,
                type_document: child.type_document,
                type_document_name: child.type_document_name || '',
            }))
        );

        if (dteChildren.length > 0) {
            console.log(`[${new Date().toISOString()}] Creating DTE_Children sheet with ${dteChildren.length} records`);
            const dteChildrenSheet = XLSX.utils.json_to_sheet(dteChildren);
            XLSX.utils.book_append_sheet(workbook, dteChildrenSheet, "DTE_Children");
            console.log(`[${new Date().toISOString()}] Created DTE_Children sheet successfully`);
        }

        // Create Customers sheet
        const customers = Array.from(cache.customers.values()).map((customer) => ({
            id: customer.id,
            type_customer: customer.type_customer || '',
            rut: customer.rut || '',
            name: customer.name || '',
            name_fantasy: customer.name_fantasy || '',
            address: customer.address || '',
            business_activity: customer.business_activity || '',
            city_id: customer.city_id || 0,
            commune_id: customer.commune_id || 0,
            active: customer.active,
            code: customer.code || '',
            name_payment: customer.name_payment || '',
            phone_payment: customer.phone_payment || '',
            email: customer.email?.join("; ") || '',
            business_contact: customer.business_contact || '',
            email_commercial: customer.email_commercial?.join("; ") || '',
            phone: customer.phone || '',
            mobile: customer.mobile || '',
            reference: customer.reference || '',
            discount: customer.discount || 0,
            credit: customer.credit || 0,
            type_payment_id: customer.type_payment_id || 0,
            credit_amount: customer.credit_amount || 0,
            is_overdue_invoice: customer.is_overdue_invoice,
            days_overdue: customer.days_overdue || 0,
            price_list_id: customer.price_list_id || 0,
            price_list_name: customer.price_list_name || '',
            is_price_list_default: customer.is_price_list_default,
            full_address: customer.full_address || '',
        }));

        if (customers.length > 0) {
            console.log(`[${new Date().toISOString()}] Creating Customers sheet with ${customers.length} records`);
            const customersSheet = XLSX.utils.json_to_sheet(customers);
            XLSX.utils.book_append_sheet(workbook, customersSheet, "Customers");
            console.log(`[${new Date().toISOString()}] Created Customers sheet successfully`);
        }

        // Create Cities sheet
        const cities = Array.from(cache.cities.values()).map((city) => ({
            id: city.id,
            name: city.name || '',
        }));

        if (cities.length > 0) {
            console.log(`[${new Date().toISOString()}] Creating Cities sheet with ${cities.length} records`);
            const citiesSheet = XLSX.utils.json_to_sheet(cities);
            XLSX.utils.book_append_sheet(workbook, citiesSheet, "Cities");
            console.log(`[${new Date().toISOString()}] Created Cities sheet successfully`);
        }

        // Create Communes sheet
        const communes = Array.from(cache.communes.values()).map((commune) => ({
            id: commune.id,
            name: commune.name || '',
            city_id: commune.city_id || 0,
        }));

        if (communes.length > 0) {
            console.log(`[${new Date().toISOString()}] Creating Communes sheet with ${communes.length} records`);
            const communesSheet = XLSX.utils.json_to_sheet(communes);
            XLSX.utils.book_append_sheet(workbook, communesSheet, "Communes");
            console.log(`[${new Date().toISOString()}] Created Communes sheet successfully`);
        }

        // Create Sellers sheet
        const sellers = Array.from(cache.sellers.values()).map((seller) => ({
            id: seller.id,
            first_name: seller.first_name || '',
            last_name: seller.last_name || '',
            role: seller.role || '',
            profile_id: seller.profile_id || 0,
        }));

        if (sellers.length > 0) {
            console.log(`[${new Date().toISOString()}] Creating Sellers sheet with ${sellers.length} records`);
            const sellersSheet = XLSX.utils.json_to_sheet(sellers);
            XLSX.utils.book_append_sheet(workbook, sellersSheet, "Sellers");
            console.log(`[${new Date().toISOString()}] Created Sellers sheet successfully`);
        }

        // Create Payment Types sheet
        const paymentTypes = Array.from(cache.paymentTypes.values()).map(
            (paymentType) => ({
                id: paymentType.id,
                name: paymentType.name || '',
                fma_pago_sii: paymentType.fma_pago_sii || 0,
                kind_payment: paymentType.kind_payment || 0,
                enabled: paymentType.enabled,
            })
        );

        if (paymentTypes.length > 0) {
            console.log(`[${new Date().toISOString()}] Creating Payment_Types sheet with ${paymentTypes.length} records`);
            const paymentTypesSheet = XLSX.utils.json_to_sheet(paymentTypes);
            XLSX.utils.book_append_sheet(workbook, paymentTypesSheet, "Payment_Types");
            console.log(`[${new Date().toISOString()}] Created Payment_Types sheet successfully`);
        }

        // Create Users sheet
        const users = Array.from(cache.users.values()).map((user) => ({
            id: user.id,
            branch_id: user.branch_id || 0,
            first_name: user.first_name || '',
            last_name: user.last_name || '',
            role: user.role || '',
            email: user.email || '',
            token: user.token || '',
            ware_house_id: user.ware_house_id || 0,
            seller_id: user.seller_id || 0,
            channel_id: user.channel_id || 0,
            type_document_sii: user.type_document_sii || '',
            type_document_sn: user.type_document_sn || '',
            type_payment_id: user.type_payment_id || 0,
            type_print_pos: user.type_print_pos || 0,
            ticket: user.ticket,
            is_income_paid: user.is_income_paid,
            comment_estimate: user.comment_estimate || '',
            comment_sales_note: user.comment_sales_note || '',
            comment_dte: user.comment_dte || '',
            charset_id: user.charset_id || 0,
            charset_name: user.charset_name || '',
            is_mnt_bruto_estimate: user.is_mnt_bruto_estimate,
            ware_house_web_id: user.ware_house_web_id || 0,
            is_owner_warehouse: user.is_owner_warehouse,
        }));

        if (users.length > 0) {
            console.log(`[${new Date().toISOString()}] Creating Users sheet with ${users.length} records`);
            const usersSheet = XLSX.utils.json_to_sheet(users);
            XLSX.utils.book_append_sheet(workbook, usersSheet, "Users");
            console.log(`[${new Date().toISOString()}] Created Users sheet successfully`);
        }

        // Create References sheet
        const references = data.flatMap((dte) =>
            (dte.details?.references || []).map((reference) => ({
                dte_id: dte.id,
                dte_folio: dte.folio,
                id: reference.id,
                e_document_id: reference.e_document_id,
                tpo_doc_ref_id: reference.tpo_doc_ref_id,
                code_ref: reference.code_ref,
                folio_ref: reference.folio_ref,
                date_ref: reference.date_ref,
                razon_ref: reference.razon_ref,
                rut_otro: reference.rut_otro || '',
                created_at: reference.created_at,
                updated_at: reference.updated_at,
                is_dte: reference.is_dte,
                rut_otr: reference.rut_otr || '',
                company_id: reference.company_id,
                business_id: reference.business_id,
                reference_name: cache.references.get(reference.tpo_doc_ref_id)?.name || 'Unknown'
            }))
        );

        if (references.length > 0) {
            console.log(`[${new Date().toISOString()}] Creating References sheet with ${references.length} records`);
            const referencesSheet = XLSX.utils.json_to_sheet(references);
            XLSX.utils.book_append_sheet(workbook, referencesSheet, "References");
            console.log(`[${new Date().toISOString()}] Created References sheet successfully`);
        }

        // Write the workbook to a file
        console.log(`[${new Date().toISOString()}] Writing workbook to file: ${fileName}`);
        XLSX.writeFile(workbook, fileName);
        const duration = Date.now() - startTime;
        console.log(`[${new Date().toISOString()}] Successfully saved data to ${fileName} in ${duration}ms`);
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error saving to Excel:`, error);
        throw error;
    }
}
