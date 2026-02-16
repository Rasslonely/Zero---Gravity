/// ═══════════════════════════════════════════════════════
/// ZERO-GRAVITY: Vault Contract (Solvency Engine)
/// ═══════════════════════════════════════════════════════
///
/// The Vault holds user deposits and emits SolvencySignals
/// when a user requests a cross-chain swipe. The Oracle
/// listens for these signals to trigger BCH liquidity release.
///
/// Security invariants:
///   1. A user can never swipe more than their balance (atomic deduction).
///   2. Every swipe has a unique nonce per user (replay prevention).
///   3. SolvencySignal is emitted AFTER balance deduction (cannot lie about solvency).

use starknet::ContractAddress;

/// ── Interface ──────────────────────────────────────────
#[starknet::interface]
pub trait IVault<TContractState> {
    /// Deposit funds into the vault. Increases caller's balance.
    fn deposit(ref self: TContractState, amount: u256);

    /// Request a cross-chain swipe. Deducts balance and emits SolvencySignal.
    /// Reverts if balance < amount.
    fn request_swipe(ref self: TContractState, amount: u256, bch_target: felt252);

    /// View the balance of a specific user.
    fn get_balance(self: @TContractState, user: ContractAddress) -> u256;

    /// View the current nonce of a specific user.
    fn get_nonce(self: @TContractState, user: ContractAddress) -> u64;
}

/// ── Contract ───────────────────────────────────────────
#[starknet::contract]
pub mod Vault {
    use starknet::ContractAddress;
    use starknet::get_caller_address;
    use starknet::storage::{Map, StorageMapReadAccess, StorageMapWriteAccess};
    use super::IVault;

    // ── Storage ──
    #[storage]
    struct Storage {
        /// Maps user address → deposited balance (in smallest unit, e.g. wei/satoshis)
        balances: Map<ContractAddress, u256>,
        /// Maps user address → monotonically increasing nonce (for replay prevention)
        nonce_counter: Map<ContractAddress, u64>,
    }

    // ── Events ──
    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        SolvencySignal: SolvencySignal,
        Deposit: DepositEvent,
    }

    /// Emitted when a user requests a cross-chain swipe.
    /// The Oracle listens for this event to trigger BCH liquidity release.
    #[derive(Drop, starknet::Event)]
    pub struct SolvencySignal {
        /// The user who initiated the swipe (indexed for filtering)
        #[key]
        pub user: ContractAddress,
        /// Amount locked for this swipe (in vault's base unit)
        pub amount: u256,
        /// Target BCH address (encoded as felt252)
        pub bch_address: felt252,
        /// Unique nonce for this user's swipe (prevents replay)
        pub nonce: u64,
    }

    /// Emitted when a user deposits funds into the vault.
    #[derive(Drop, starknet::Event)]
    pub struct DepositEvent {
        #[key]
        pub user: ContractAddress,
        pub amount: u256,
        pub new_balance: u256,
    }

    // ── Implementation ──
    #[abi(embed_v0)]
    impl VaultImpl of IVault<ContractState> {
        /// Deposit funds into the vault.
        ///
        /// In a production system, this would transfer ERC-20 tokens from the caller
        /// to this contract. For the hackathon demo, we use a simplified model where
        /// the deposit is a self-reported balance increment (no actual token transfer).
        ///
        /// # Arguments
        /// * `amount` - The amount to deposit (must be > 0)
        fn deposit(ref self: ContractState, amount: u256) {
            // Validate
            assert(amount > 0, 'ZERO_DEPOSIT');

            // Get caller
            let caller = get_caller_address();

            // Read current balance
            let current_balance = self.balances.read(caller);

            // Update balance (addition cannot overflow for reasonable amounts)
            let new_balance = current_balance + amount;
            self.balances.write(caller, new_balance);

            // Emit deposit event
            self.emit(Event::Deposit(DepositEvent {
                user: caller,
                amount: amount,
                new_balance: new_balance,
            }));
        }

        /// Request a cross-chain swipe.
        ///
        /// This atomically:
        ///   1. Asserts the caller has sufficient balance
        ///   2. Deducts the amount from the caller's balance
        ///   3. Increments the caller's nonce
        ///   4. Emits a SolvencySignal for the Oracle to pick up
        ///
        /// # Arguments
        /// * `amount` - The amount to swipe (must be > 0, must be <= balance)
        /// * `bch_target` - The BCH recipient address (encoded as felt252)
        ///
        /// # Panics
        /// * `INSUFFICIENT_BALANCE` if the caller's balance < amount
        /// * `ZERO_AMOUNT` if amount is 0
        fn request_swipe(ref self: ContractState, amount: u256, bch_target: felt252) {
            // Validate
            assert(amount > 0, 'ZERO_AMOUNT');

            // Get caller
            let caller = get_caller_address();

            // Read current balance
            let current_balance = self.balances.read(caller);

            // CRITICAL: Assert solvency BEFORE deduction
            assert(current_balance >= amount, 'INSUFFICIENT_BALANCE');

            // Atomically deduct balance
            let new_balance = current_balance - amount;
            self.balances.write(caller, new_balance);

            // Increment nonce (monotonic, starts at 0 → first swipe gets nonce 1)
            let current_nonce = self.nonce_counter.read(caller);
            let new_nonce = current_nonce + 1;
            self.nonce_counter.write(caller, new_nonce);

            // Emit SolvencySignal — the Oracle's trigger
            self.emit(Event::SolvencySignal(SolvencySignal {
                user: caller,
                amount: amount,
                bch_address: bch_target,
                nonce: new_nonce,
            }));
        }

        /// View function: read a user's current vault balance.
        fn get_balance(self: @ContractState, user: ContractAddress) -> u256 {
            self.balances.read(user)
        }

        /// View function: read a user's current nonce.
        fn get_nonce(self: @ContractState, user: ContractAddress) -> u64 {
            self.nonce_counter.read(user)
        }
    }
}
