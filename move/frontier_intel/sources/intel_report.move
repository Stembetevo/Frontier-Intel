/// Frontier Intel — on-chain intel report module for EVE Frontier
/// Deployed on Sui testnet.
///
/// Each report is a standalone Sui object owned by the submitter.
/// A shared Registry accumulates report IDs for off-chain indexing.
module frontier_intel::intel_report {
    use std::string::{Self, String};
    use sui::event;
    use sui::clock::{Self, Clock};

    // ── Report types ───────────────────────────────────────────────────────────
    const REPORT_OTHER:u8 = 5;

    // ── Errors ────────────────────────────────────────────────────────────────
    const EInvalidReportType:u64 = 1;
    const EMessageTooLong:u64 = 2;
    const ESystemIdTooLong:    u64 = 3;

    const MAX_MESSAGE_LEN: u64 = 1024;
    const MAX_SYSTEM_ID_LEN: u64 = 64;

    // ── Structs ───────────────────────────────────────────────────────────────

    /// A single player intel report. Owned by the submitter.
    public struct IntelReport has key, store {
        id: UID,
        solar_system_id: String,
        message: String,
        report_type: u8,
        author: address,
        timestamp_ms: u64,
    }

    /// Shared registry — append-only log of all report IDs.
    public struct Registry has key {
        id: UID,
        report_count: u64,
    }

    // ── Events ────────────────────────────────────────────────────────────────

    /// Emitted every time a report is submitted. Indexers watch this.
    public struct IntelReportSubmitted has copy, drop {
        report_id: ID,
        solar_system_id: String,
        report_type: u8,
        author: address,
        timestamp_ms: u64,
    }

    // ── Init ──────────────────────────────────────────────────────────────────

    fun init(ctx: &mut TxContext) {
        let registry = Registry {
            id: object::new(ctx),
            report_count: 0,
        };
        transfer::share_object(registry);
    }

    // ── Entry functions ───────────────────────────────────────────────────────

    /// Submit a new intel report.
    /// The report object is transferred to the caller.
    #[allow(lint(self_transfer))]
    public fun submit_report(
        registry: &mut Registry,
        clock: &Clock,
        solar_system_id: vector<u8>,
        message: vector<u8>,
        report_type: u8,
        ctx: &mut TxContext,
    ) {
        // Validate inputs
        assert!(report_type <= REPORT_OTHER, EInvalidReportType);
        assert!(vector::length(&message) <= MAX_MESSAGE_LEN, EMessageTooLong);
        assert!(vector::length(&solar_system_id) <= MAX_SYSTEM_ID_LEN, ESystemIdTooLong);

        let system_str = string::utf8(solar_system_id);
        let message_str = string::utf8(message);
        let ts = clock::timestamp_ms(clock);
        let author = ctx.sender();

        let report = IntelReport {
            id: object::new(ctx),
            solar_system_id: system_str,
            message: message_str,
            report_type,
            author,
            timestamp_ms: ts,
        };

        let report_id = object::id(&report);

        // Update registry counter
        registry.report_count = registry.report_count + 1;

        // Emit event for indexers
        event::emit(IntelReportSubmitted {
            report_id,
            solar_system_id: string::utf8(solar_system_id),
            report_type,
            author,
            timestamp_ms: ts,
        });

        // Transfer report to submitter
        transfer::transfer(report, author);
    }

    // ── Read functions ────────────────────────────────────────────────────────

    public fun report_count(registry: &Registry): u64 {
        registry.report_count
    }

    public fun get_solar_system_id(report: &IntelReport): &String {
        &report.solar_system_id
    }

    public fun get_message(report: &IntelReport): &String {
        &report.message
    }

    public fun get_report_type(report: &IntelReport): u8 {
        report.report_type
    }

    public fun get_author(report: &IntelReport): address {
        report.author
    }

    public fun get_timestamp_ms(report: &IntelReport): u64 {
        report.timestamp_ms
    }
}
