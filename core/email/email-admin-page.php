<?php
/**
 * Email Admin Page.
 *
 * Responsibilities:
 * - Admin page for email settings and logs.
 * - Tabs: Settings and Logs.
 * - Uses UI-kit components (button, icon, loader, form).
 */

namespace Elkaretro\Core\Email;

defined( 'ABSPATH' ) || exit;

class Email_Admin_Page {

	/**
	 * Page slug.
	 */
	const PAGE_SLUG = 'elkaretro-email-settings';

	/**
	 * Initialize admin page.
	 *
	 * @return void
	 */
	public static function init() {
		add_action( 'admin_menu', array( __CLASS__, 'add_admin_page' ) );
		add_action( 'admin_enqueue_scripts', array( __CLASS__, 'enqueue_scripts' ) );
	}

	/**
	 * Add admin page to menu.
	 *
	 * @return void
	 */
	public static function add_admin_page() {
		add_theme_page(
			__( 'Email Settings', 'elkaretro' ),
			__( 'Email Settings', 'elkaretro' ),
			'manage_options',
			self::PAGE_SLUG,
			array( __CLASS__, 'render_page' )
		);
	}

	/**
	 * Enqueue scripts and styles.
	 *
	 * @param string $hook Current admin page hook.
	 * @return void
	 */
	public static function enqueue_scripts( $hook ) {
		if ( $hook !== 'appearance_page_' . self::PAGE_SLUG ) {
			return;
		}

		// Enqueue UI-kit components.
		wp_enqueue_script( 'elkaretro-components', get_template_directory_uri() . '/components/components.js', array(), '1.0.0', true );

		// Enqueue email admin page script.
		wp_enqueue_script(
			'elkaretro-email-admin',
			get_template_directory_uri() . '/core/email/email-admin-page.js',
			array( 'elkaretro-components' ),
			'1.0.0',
			true
		);

		// Localize script with REST URL and nonce.
		$rest_url = rest_url( 'elkaretro/v1/email' );
		$nonce    = wp_create_nonce( 'wp_rest' );
		wp_localize_script(
			'elkaretro-email-admin',
			'elkaretroEmailAdmin',
			array(
				'restUrl' => $rest_url,
				'nonce'   => $nonce,
				'i18n'    => array(
					'settingsSaved'     => __( 'Settings saved successfully!', 'elkaretro' ),
					'settingsSaveFailed' => __( 'Failed to save settings.', 'elkaretro' ),
					'settingsSaveError'  => __( 'Error saving settings.', 'elkaretro' ),
					'logsLoadError'      => __( 'Error loading logs.', 'elkaretro' ),
					'noLogsFound'        => __( 'No logs found.', 'elkaretro' ),
					'date'               => __( 'Date', 'elkaretro' ),
					'to'                 => __( 'To', 'elkaretro' ),
					'subject'            => __( 'Subject', 'elkaretro' ),
					'status'             => __( 'Status', 'elkaretro' ),
					'actions'            => __( 'Actions', 'elkaretro' ),
					'sent'               => __( 'Sent', 'elkaretro' ),
					'failed'             => __( 'Failed', 'elkaretro' ),
					'delete'             => __( 'Delete', 'elkaretro' ),
					'previous'           => __( 'Previous', 'elkaretro' ),
					'next'               => __( 'Next', 'elkaretro' ),
					'page'               => __( 'Page', 'elkaretro' ),
					'of'                 => __( 'of', 'elkaretro' ),
					'confirmDelete'      => __( 'Are you sure you want to delete this log?', 'elkaretro' ),
					'deleteFailed'       => __( 'Failed to delete log.', 'elkaretro' ),
					'deleteError'        => __( 'Error deleting log.', 'elkaretro' ),
				),
			)
		);
	}

	/**
	 * Render admin page.
	 *
	 * @return void
	 */
	public static function render_page() {
		?>
		<div class="wrap elkaretro-email-admin">
			<h1><?php echo esc_html( __( 'Email Settings', 'elkaretro' ) ); ?></h1>

			<div class="elkaretro-email-admin__tabs">
				<button class="elkaretro-email-admin__tab-button active" data-tab="settings">
					<?php echo esc_html( __( 'SMTP Settings', 'elkaretro' ) ); ?>
				</button>
				<button class="elkaretro-email-admin__tab-button" data-tab="logs">
					<?php echo esc_html( __( 'Email Logs', 'elkaretro' ) ); ?>
				</button>
			</div>

			<div class="elkaretro-email-admin__content">
				<!-- Settings Tab -->
				<div class="elkaretro-email-admin__tab-content" data-tab-content="settings">
					<div class="elkaretro-email-admin__card">
						<h2><?php echo esc_html( __( 'SMTP Configuration', 'elkaretro' ) ); ?></h2>
						<p class="description">
							<?php echo esc_html( __( 'Configure SMTP settings for sending emails. If SMTP is disabled, WordPress default mail function will be used.', 'elkaretro' ) ); ?>
						</p>

						<form id="elkaretro-email-settings-form" class="elkaretro-email-admin__form">
							<div class="elkaretro-email-admin__form-group">
								<label>
									<input type="checkbox" name="smtp_enabled" id="smtp_enabled" />
									<?php echo esc_html( __( 'Enable SMTP', 'elkaretro' ) ); ?>
								</label>
							</div>

							<div class="elkaretro-email-admin__form-group">
								<label for="smtp_host">
									<?php echo esc_html( __( 'SMTP Host', 'elkaretro' ) ); ?>
								</label>
								<input type="text" name="smtp_host" id="smtp_host" class="regular-text" />
							</div>

							<div class="elkaretro-email-admin__form-group">
								<label for="smtp_port">
									<?php echo esc_html( __( 'SMTP Port', 'elkaretro' ) ); ?>
								</label>
								<input type="number" name="smtp_port" id="smtp_port" class="small-text" min="1" max="65535" value="587" />
								<p class="description">
									<?php echo esc_html( __( 'Common ports: 587 (TLS), 465 (SSL), 25 (unencrypted)', 'elkaretro' ) ); ?>
								</p>
							</div>

							<div class="elkaretro-email-admin__form-group">
								<label for="smtp_secure">
									<?php echo esc_html( __( 'Encryption', 'elkaretro' ) ); ?>
								</label>
								<select name="smtp_secure" id="smtp_secure">
									<option value="tls">TLS</option>
									<option value="ssl">SSL</option>
								</select>
							</div>

							<div class="elkaretro-email-admin__form-group">
								<label>
									<input type="checkbox" name="smtp_auth" id="smtp_auth" />
									<?php echo esc_html( __( 'Require Authentication', 'elkaretro' ) ); ?>
								</label>
							</div>

							<div class="elkaretro-email-admin__form-group">
								<label for="smtp_username">
									<?php echo esc_html( __( 'SMTP Username', 'elkaretro' ) ); ?>
								</label>
								<input type="text" name="smtp_username" id="smtp_username" class="regular-text" />
							</div>

							<div class="elkaretro-email-admin__form-group">
								<label for="smtp_password">
									<?php echo esc_html( __( 'SMTP Password', 'elkaretro' ) ); ?>
								</label>
								<input type="password" name="smtp_password" id="smtp_password" class="regular-text" />
							</div>

							<div class="elkaretro-email-admin__form-group">
								<label for="from_name">
									<?php echo esc_html( __( 'From Name', 'elkaretro' ) ); ?>
								</label>
								<input type="text" name="from_name" id="from_name" class="regular-text" />
								<p class="description">
									<?php echo esc_html( __( 'Leave empty to use site name', 'elkaretro' ) ); ?>
								</p>
							</div>

							<div class="elkaretro-email-admin__form-group">
								<label for="from_email">
									<?php echo esc_html( __( 'From Email', 'elkaretro' ) ); ?>
								</label>
								<input type="email" name="from_email" id="from_email" class="regular-text" />
								<p class="description">
									<?php echo esc_html( __( 'Leave empty to use admin email', 'elkaretro' ) ); ?>
								</p>
							</div>

							<div class="elkaretro-email-admin__form-actions">
								<button type="submit" class="button button-primary">
									<?php echo esc_html( __( 'Save Settings', 'elkaretro' ) ); ?>
								</button>
							</div>
						</form>
					</div>
				</div>

				<!-- Logs Tab -->
				<div class="elkaretro-email-admin__tab-content" data-tab-content="logs" style="display: none;">
					<div class="elkaretro-email-admin__card">
						<h2><?php echo esc_html( __( 'Email Logs', 'elkaretro' ) ); ?></h2>

						<div class="elkaretro-email-admin__logs-filters">
							<input type="text" id="logs_search" placeholder="<?php echo esc_attr( __( 'Search by email or subject...', 'elkaretro' ) ); ?>" class="regular-text" />
							<select id="logs_status">
								<option value=""><?php echo esc_html( __( 'All Statuses', 'elkaretro' ) ); ?></option>
								<option value="sent"><?php echo esc_html( __( 'Sent', 'elkaretro' ) ); ?></option>
								<option value="failed"><?php echo esc_html( __( 'Failed', 'elkaretro' ) ); ?></option>
							</select>
							<button type="button" id="logs_refresh" class="button">
								<?php echo esc_html( __( 'Refresh', 'elkaretro' ) ); ?>
							</button>
						</div>

						<div id="elkaretro-email-logs-container">
							<block-loader type="container" label="<?php echo esc_attr( __( 'Loading logs...', 'elkaretro' ) ); ?>"></block-loader>
						</div>

						<div id="elkaretro-email-logs-pagination" class="elkaretro-email-admin__pagination"></div>
					</div>
				</div>
			</div>
		</div>

		<script>
		// Initialize email admin page when DOM is ready
		document.addEventListener('DOMContentLoaded', function() {
			if (typeof window.ELKARETRO_EMAIL_ADMIN !== 'undefined' && typeof elkaretroEmailAdmin !== 'undefined') {
				window.ELKARETRO_EMAIL_ADMIN.init(elkaretroEmailAdmin.restUrl, elkaretroEmailAdmin.nonce);
				// Copy i18n strings
				if (elkaretroEmailAdmin.i18n) {
					window.ELKARETRO_EMAIL_ADMIN.i18n = elkaretroEmailAdmin.i18n;
				}
			}
		});
		</script>

		<style>
		.elkaretro-email-admin__tabs {
			display: flex;
			gap: 0.5rem;
			border-bottom: 1px solid #ccc;
			margin-bottom: 1.5rem;
		}
		.elkaretro-email-admin__tab-button {
			padding: 0.75rem 1.5rem;
			background: transparent;
			border: none;
			border-bottom: 2px solid transparent;
			cursor: pointer;
			font-size: 14px;
			margin-bottom: -1px;
		}
		.elkaretro-email-admin__tab-button:hover {
			background: #f5f5f5;
		}
		.elkaretro-email-admin__tab-button.active {
			border-bottom-color: #2271b1;
			color: #2271b1;
		}
		.elkaretro-email-admin__card {
			background: #fff;
			border: 1px solid #ccd0d4;
			box-shadow: 0 1px 1px rgba(0,0,0,.04);
			padding: 1.5rem;
		}
		.elkaretro-email-admin__form-group {
			margin-bottom: 1.5rem;
		}
		.elkaretro-email-admin__form-group label {
			display: block;
			margin-bottom: 0.5rem;
			font-weight: 600;
		}
		.elkaretro-email-admin__form-group input[type="checkbox"] {
			margin-right: 0.5rem;
		}
		.elkaretro-email-admin__logs-filters {
			display: flex;
			gap: 1rem;
			margin-bottom: 1.5rem;
			align-items: center;
		}
		.status-success {
			color: #00a32a;
		}
		.status-error {
			color: #d63638;
		}
		.elkaretro-email-admin__pagination {
			margin-top: 1.5rem;
		}
		.elkaretro-email-admin__pagination-controls {
			display: flex;
			gap: 1rem;
			align-items: center;
		}
		</style>
		<?php
	}
}

