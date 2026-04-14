use pinocchio::{
    cpi::{Signer, invoke, invoke_signed},
    instruction::{InstructionAccount, InstructionView},
    AccountView, Address, ProgramResult,
};

/// Simple helper for SPL Token Transfer CPI without external dependencies.
pub struct TokenTransfer<'a> {
    pub from:      &'a AccountView,
    pub to:        &'a AccountView,
    pub authority: &'a AccountView,
    pub amount:    u64,
}

impl<'a> TokenTransfer<'a> {
    pub fn invoke(&self, token_program: &AccountView) -> ProgramResult {
        let mut data = [0u8; 9];
        data[0] = 3; // Transfer discriminator
        data[1..9].copy_from_slice(&self.amount.to_le_bytes());

        let ix_accounts = [
            InstructionAccount { address: self.from.address(), is_writable: true, is_signer: false },
            InstructionAccount { address: self.to.address(), is_writable: true, is_signer: false },
            InstructionAccount { address: self.authority.address(), is_writable: false, is_signer: true },
        ];
        let instruction = InstructionView {
            program_id: token_program.address(),
            data:       &data,
            accounts:   &ix_accounts,
        };
        let account_views = [self.from, self.to, self.authority];

        invoke(&instruction, &account_views)
    }

    pub fn invoke_signed(
        &self,
        token_program: &AccountView,
        signers:       &[Signer],
    ) -> ProgramResult {
        let mut data = [0u8; 9];
        data[0] = 3; // Transfer discriminator
        data[1..9].copy_from_slice(&self.amount.to_le_bytes());

        let ix_accounts = [
            InstructionAccount { address: self.from.address(), is_writable: true, is_signer: false },
            InstructionAccount { address: self.to.address(), is_writable: true, is_signer: false },
            InstructionAccount { address: self.authority.address(), is_writable: false, is_signer: true },
        ];
        let instruction = InstructionView {
            program_id: token_program.address(),
            data:       &data,
            accounts:   &ix_accounts,
        };
        let account_views = [self.from, self.to, self.authority];

        invoke_signed(&instruction, &account_views, signers)
    }
}

/// Simple helper for System Program CreateAccount CPI.
pub struct CreateAccount<'a> {
    pub from:     &'a AccountView,
    pub to:       &'a AccountView,
    pub lamports: u64,
    pub space:    u64,
    pub owner:    &'a Address,
}

impl<'a> CreateAccount<'a> {
    pub fn invoke_signed(
        &self,
        system_program: &AccountView,
        signers:        &[Signer],
    ) -> ProgramResult {
        let mut data = [0u8; 52];
        data[0..4].copy_from_slice(&0u32.to_le_bytes()); // CreateAccount discriminator
        data[4..12].copy_from_slice(&self.lamports.to_le_bytes());
        data[12..20].copy_from_slice(&self.space.to_le_bytes());
        data[20..52].copy_from_slice(self.owner.as_ref());

        let ix_accounts = [
            InstructionAccount { address: self.from.address(), is_writable: true, is_signer: true },
            InstructionAccount { address: self.to.address(), is_writable: true, is_signer: true },
        ];
        let instruction = InstructionView {
            program_id: system_program.address(),
            data:       &data,
            accounts:   &ix_accounts,
        };
        let account_views = [self.from, self.to];

        invoke_signed(&instruction, &account_views, signers)
    }
}
