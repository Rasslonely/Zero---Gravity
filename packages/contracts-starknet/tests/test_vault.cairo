use zero_gravity_vault::Vault;
use zero_gravity_vault::IVaultDispatcher;
use zero_gravity_vault::IVaultDispatcherTrait;
use starknet::ContractAddress;
use snforge_std::{declare, ContractClassTrait, DeclareResultTrait};
use snforge_std::{start_cheat_caller_address, stop_cheat_caller_address};
use snforge_std::{spy_events, EventSpyAssertionsTrait};

/// Helper: deploy a fresh Vault and return its dispatcher
fn deploy_vault() -> IVaultDispatcher {
    let contract = declare("Vault").unwrap().contract_class();
    let (contract_address, _) = contract.deploy(@array![]).unwrap();
    IVaultDispatcher { contract_address }
}

/// Helper: a consistent test user address
fn user_addr() -> ContractAddress {
    0x123.try_into().unwrap()
}

// ── Test 1: Deposit ────────────────────────────────────
#[test]
fn test_deposit() {
    let vault = deploy_vault();
    let user = user_addr();

    // Deposit 100 as user
    start_cheat_caller_address(vault.contract_address, user);
    vault.deposit(100_u256);
    stop_cheat_caller_address(vault.contract_address);

    // Verify balance
    let balance = vault.get_balance(user);
    assert(balance == 100_u256, 'Balance should be 100');
}

// ── Test 2: Request Swipe ──────────────────────────────
#[test]
fn test_request_swipe() {
    let vault = deploy_vault();
    let user = user_addr();
    let bch_target: felt252 = 'bchtest:qz...';

    // Deposit 100
    start_cheat_caller_address(vault.contract_address, user);
    vault.deposit(100_u256);

    // Swipe 5 → balance should be 95, nonce should be 1
    vault.request_swipe(5_u256, bch_target);
    stop_cheat_caller_address(vault.contract_address);

    let balance = vault.get_balance(user);
    assert(balance == 95_u256, 'Balance should be 95');

    let nonce = vault.get_nonce(user);
    assert(nonce == 1_u64, 'Nonce should be 1');
}

// ── Test 3: Insufficient Funds ─────────────────────────
#[test]
#[should_panic(expected: ('INSUFFICIENT_BALANCE',))]
fn test_insufficient_funds() {
    let vault = deploy_vault();
    let user = user_addr();
    let bch_target: felt252 = 'bchtest:qz...';

    // Deposit 10, then try to swipe 50 → should panic
    start_cheat_caller_address(vault.contract_address, user);
    vault.deposit(10_u256);
    vault.request_swipe(50_u256, bch_target); // BOOM
    stop_cheat_caller_address(vault.contract_address);
}

// ── Test 4: SolvencySignal Event ───────────────────────
#[test]
fn test_solvency_event() {
    let vault = deploy_vault();
    let user = user_addr();
    let bch_target: felt252 = 'bchtest:qz...';

    // Spy on events
    let mut spy = spy_events();

    // Deposit + swipe
    start_cheat_caller_address(vault.contract_address, user);
    vault.deposit(100_u256);
    vault.request_swipe(25_u256, bch_target);
    stop_cheat_caller_address(vault.contract_address);

    // Assert SolvencySignal was emitted with correct data
    spy.assert_emitted(
        @array![
            (
                vault.contract_address,
                Vault::Event::SolvencySignal(
                    Vault::SolvencySignal {
                        user: user,
                        amount: 25_u256,
                        bch_address: bch_target,
                        nonce: 1_u64,
                    }
                )
            )
        ]
    );
}
