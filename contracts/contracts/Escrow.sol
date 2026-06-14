// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title Escrow
 * @notice Single-contract escrow keyed by dealId = keccak256(orderId).
 *         Client funds → designer receives on release, client receives on refund.
 */
contract Escrow {
    enum State { None, Funded, Released, Refunded }

    struct Deal {
        address client;
        address designer;
        uint256 amount;
        State   state;
    }

    mapping(bytes32 => Deal) public deals;

    event Funded(bytes32 indexed dealId, address indexed client, address indexed designer, uint256 amount);
    event Released(bytes32 indexed dealId, address indexed designer, uint256 amount);
    event Refunded(bytes32 indexed dealId, address indexed client, uint256 amount);

    error DealExists();
    error DealNotFunded();
    error NotClient();
    error ZeroAmount();

    /// @notice Client locks ETH into escrow.
    /// @param dealId   keccak256(abi.encodePacked(orderId)) computed on the frontend
    /// @param designer Designer's wallet — receives funds on release
    function fund(bytes32 dealId, address designer) external payable {
        if (deals[dealId].state != State.None) revert DealExists();
        if (msg.value == 0) revert ZeroAmount();

        deals[dealId] = Deal({
            client:   msg.sender,
            designer: designer,
            amount:   msg.value,
            state:    State.Funded
        });

        emit Funded(dealId, msg.sender, designer, msg.value);
    }

    /// @notice Client approves — releases funds to designer.
    function release(bytes32 dealId) external {
        Deal storage d = deals[dealId];
        if (d.state != State.Funded) revert DealNotFunded();
        if (d.client != msg.sender)  revert NotClient();

        d.state = State.Released;
        emit Released(dealId, d.designer, d.amount);

        (bool ok,) = d.designer.call{value: d.amount}("");
        require(ok, "Transfer failed");
    }

    /// @notice Client rejects — refunds ETH back to client.
    function refund(bytes32 dealId) external {
        Deal storage d = deals[dealId];
        if (d.state != State.Funded) revert DealNotFunded();
        if (d.client != msg.sender)  revert NotClient();

        d.state = State.Refunded;
        emit Refunded(dealId, d.client, d.amount);

        (bool ok,) = d.client.call{value: d.amount}("");
        require(ok, "Transfer failed");
    }
}
