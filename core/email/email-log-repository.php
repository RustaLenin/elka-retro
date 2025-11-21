<?php
/**
 * Email Log Repository.
 *
 * Responsibilities:
 * - CRUD operations for email logs (Custom Post Type).
 * - Work with meta fields: _to_email, _subject, _error_message, _context, _sent_result.
 */

namespace Elkaretro\Core\Email;

use WP_Error;

defined( 'ABSPATH' ) || exit;

class Email_Log_Repository {

	/**
	 * Create email log entry.
	 *
	 * @param array $data {
	 *     @type string $to_email Email recipient.
	 *     @type string $subject Email subject.
	 *     @type string $sent_result 'sent' or 'failed'.
	 *     @type string $error_message Error message (if failed).
	 *     @type array  $context Context data (JSON encoded).
	 * }
	 * @return int|WP_Error Log post ID or error.
	 */
	public function create( $data ) {
		$to_email      = isset( $data['to_email'] ) ? sanitize_email( $data['to_email'] ) : '';
		$subject      = isset( $data['subject'] ) ? sanitize_text_field( $data['subject'] ) : '';
		$sent_result  = isset( $data['sent_result'] ) && in_array( $data['sent_result'], array( 'sent', 'failed' ), true )
			? $data['sent_result']
			: 'failed';
		$error_message = isset( $data['error_message'] ) ? sanitize_textarea_field( $data['error_message'] ) : '';
		$context      = isset( $data['context'] ) && is_array( $data['context'] )
			? wp_json_encode( $data['context'], JSON_UNESCAPED_UNICODE )
			: '';

		if ( empty( $to_email ) || empty( $subject ) ) {
			return new WP_Error(
				'email_log_invalid_data',
				__( 'Email and subject are required.', 'elkaretro' ),
				array( 'status' => 400 )
			);
		}

		$post_id = wp_insert_post(
			array(
				'post_type'   => Email_Post_Type::POST_TYPE,
				'post_status' => 'publish',
				'post_title'  => $subject,
				'post_date'   => current_time( 'mysql' ),
			),
			true
		);

		if ( is_wp_error( $post_id ) ) {
			return $post_id;
		}

		// Save meta fields.
		update_post_meta( $post_id, '_to_email', $to_email );
		update_post_meta( $post_id, '_subject', $subject );
		update_post_meta( $post_id, '_sent_result', $sent_result );
		update_post_meta( $post_id, '_error_message', $error_message );
		update_post_meta( $post_id, '_context', $context );

		return $post_id;
	}

	/**
	 * Get email log by ID.
	 *
	 * @param int $log_id Log post ID.
	 * @return array|WP_Error Log data or error.
	 */
	public function get( $log_id ) {
		$post = get_post( $log_id );

		if ( ! $post || $post->post_type !== Email_Post_Type::POST_TYPE ) {
			return new WP_Error(
				'email_log_not_found',
				__( 'Email log not found.', 'elkaretro' ),
				array( 'status' => 404 )
			);
		}

		$context = get_post_meta( $post->ID, '_context', true );
		if ( $context ) {
			$context = json_decode( $context, true );
		}

		return array(
			'id'            => $post->ID,
			'to_email'      => get_post_meta( $post->ID, '_to_email', true ),
			'subject'       => get_post_meta( $post->ID, '_subject', true ),
			'sent_result'   => get_post_meta( $post->ID, '_sent_result', true ),
			'error_message' => get_post_meta( $post->ID, '_error_message', true ),
			'context'       => $context ?: array(),
			'sent_at'       => $post->post_date,
		);
	}

	/**
	 * Get list of email logs.
	 *
	 * @param array $args {
	 *     @type int    $per_page Posts per page.
	 *     @type int    $page     Page number.
	 *     @type string $status   Filter by sent_result ('sent' or 'failed').
	 *     @type string $search   Search by email or subject.
	 * }
	 * @return array {
	 *     @type array $logs List of log entries.
	 *     @type int   $total Total count.
	 *     @type int   $pages Total pages.
	 * }
	 */
	public function get_list( $args = array() ) {
		$per_page = isset( $args['per_page'] ) ? absint( $args['per_page'] ) : 20;
		$page     = isset( $args['page'] ) ? absint( $args['page'] ) : 1;
		$status   = isset( $args['status'] ) && in_array( $args['status'], array( 'sent', 'failed' ), true )
			? $args['status']
			: '';
		$search   = isset( $args['search'] ) ? sanitize_text_field( $args['search'] ) : '';

		$query_args = array(
			'post_type'      => Email_Post_Type::POST_TYPE,
			'post_status'    => 'publish',
			'posts_per_page' => $per_page,
			'paged'          => $page,
			'orderby'        => 'date',
			'order'          => 'DESC',
		);

		// Filter by status.
		if ( $status ) {
			$query_args['meta_query'] = array(
				array(
					'key'     => '_sent_result',
					'value'   => $status,
					'compare' => '=',
				),
			);
		}

		// Search by email or subject.
		if ( $search ) {
			$query_args['meta_query'] = array(
				'relation' => 'OR',
				array(
					'key'     => '_to_email',
					'value'   => $search,
					'compare' => 'LIKE',
				),
				array(
					'key'     => '_subject',
					'value'   => $search,
					'compare' => 'LIKE',
				),
			);
		}

		$query = new \WP_Query( $query_args );

		$logs = array();
		foreach ( $query->posts as $post ) {
			$context = get_post_meta( $post->ID, '_context', true );
			if ( $context ) {
				$context = json_decode( $context, true );
			}

			$logs[] = array(
				'id'            => $post->ID,
				'to_email'      => get_post_meta( $post->ID, '_to_email', true ),
				'subject'       => get_post_meta( $post->ID, '_subject', true ),
				'sent_result'   => get_post_meta( $post->ID, '_sent_result', true ),
				'error_message' => get_post_meta( $post->ID, '_error_message', true ),
				'context'       => $context ?: array(),
				'sent_at'       => $post->post_date,
			);
		}

		return array(
			'logs'  => $logs,
			'total' => (int) $query->found_posts,
			'pages' => (int) $query->max_num_pages,
		);
	}

	/**
	 * Delete email log.
	 *
	 * @param int $log_id Log post ID.
	 * @return bool|WP_Error True on success, error on failure.
	 */
	public function delete( $log_id ) {
		$post = get_post( $log_id );

		if ( ! $post || $post->post_type !== Email_Post_Type::POST_TYPE ) {
			return new WP_Error(
				'email_log_not_found',
				__( 'Email log not found.', 'elkaretro' ),
				array( 'status' => 404 )
			);
		}

		$result = wp_delete_post( $log_id, true );

		return $result ? true : new WP_Error(
			'email_log_delete_failed',
			__( 'Failed to delete email log.', 'elkaretro' ),
			array( 'status' => 500 )
		);
	}
}

