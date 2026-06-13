-- Contract acceptance handshake.
-- When a client proposes a contract, the order starts in `pending_acceptance`.
-- The designer must accept (-> pending_escrow) or decline (-> declined) before
-- any escrow funding happens.

-- New order statuses. (ADD VALUE must be committed before it can be used.)
alter type order_status add value if not exists 'pending_acceptance';
alter type order_status add value if not exists 'declined';
