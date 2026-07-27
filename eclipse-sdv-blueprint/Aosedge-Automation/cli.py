#
#  Copyright (c) 2018-2026 EPAM Systems Inc.
#
from functools import update_wrapper
from pathlib import Path

import click

from bundles.info import show_deployment_bundles
from certificates.info import show_certificate_info, show_user_info
from layers.info import show_layers_list
from services.edit import assign_service_to_subject
from services.info import show_services_list
from settings import AosExampleSettings
from subjects.edit import create_subject
from subjects.info import show_subjects_list, show_subjects_info
from subjects.units import assign_unit_to_subject
from unitsets.edit import create_unit_set, assign_unit_to_unit_set
from unitsets.info import show_unit_sets_list
from units.info import show_unit_list, find_unit_id_by_system_uid
from unitmodels.info import show_target_unit_config, export_target_unit_config
from unitmodels.edit import update_target_unit_config, update_target_unit_config_from_url
from verification.edit import approve_verification_batch
from verification.info import show_verification_batches


def pass_obj(func):
    @click.pass_context
    def new_func(ctx, *args, **kwargs):
        return ctx.invoke(func, ctx.obj, *args, **kwargs)
    return update_wrapper(new_func, func)


@click.group()
@click.option('--crt', help='Path to the certificate file')
@click.pass_context
def cli(ctx, crt):
    if crt:
        crt_path = Path(crt).expanduser().resolve()
        if not crt_path.exists():
            raise click.ClickException(f'Certificate file not found: {crt_path}')
    ctx.obj = AosExampleSettings(certificate_path=crt)


@cli.command()
@pass_obj
def certificate_info(ctx):
    """Shows certificate info.

    Certificate path is required. Use --crt option.
    """
    if not ctx.certificate_path:
        raise click.ClickException('Certificate path is not provided. Use --crt option.')

    show_certificate_info(ctx.certificate_path)
    print('')
    show_user_info(ctx.certificate_path)


@cli.command()
@pass_obj
def subjects_list(ctx):
    """Shows list of subjects."""

    if not ctx.certificate_path:
        ctx.certificate_path = '~/.aos/security/aos-user-oem.p12'

    show_subjects_list(ctx.certificate_path)


@cli.command()
@click.argument('label')
@pass_obj
def subjects_info(ctx, label):
    """Shows info about a subject (filtered by label).

    LABEL: Subject label.
    """
    if not ctx.certificate_path:
        ctx.certificate_path = '~/.aos/security/aos-user-oem.p12'

    show_subjects_info(ctx.certificate_path, label)


@cli.command()
@pass_obj
def services_list(ctx):
    """Shows list of services."""

    if not ctx.certificate_path:
        ctx.certificate_path = '~/.aos/security/aos-user-oem.p12'

    show_services_list(ctx.certificate_path)


@cli.command()
@click.argument('codename')
@pass_obj
def services_info(ctx, codename):
    """Shows info about a service (filtered by codename).

    CODENAME: Service codename.
    """
    if not ctx.certificate_path:
        ctx.certificate_path = '~/.aos/security/aos-user-oem.p12'

    show_services_list(ctx.certificate_path, codename)


@cli.command()
@click.argument('codename')
@click.argument('label')
@pass_obj
def assign_service(ctx: AosExampleSettings, codename, label):
    """
    Assigns a service to a subject.

    CODENAME: Service codename.
    LABEL: Subject label.
    """
    if not ctx.certificate_path:
        ctx.certificate_path = '~/.aos/security/aos-user-oem.p12'

    assign_service_to_subject(ctx.certificate_path, label, codename)


@cli.command()
@pass_obj
def units_list(ctx):
    """Shows list of units."""
    if not ctx.certificate_path:
        ctx.certificate_path = '~/.aos/security/aos-user-oem.p12'

    show_unit_list(ctx.certificate_path)


@cli.command()
@click.argument('system_uid')
@pass_obj
def units_info(ctx, system_uid):
    """Shows info about a unit (filtered by system UID).

    SYSTEM_UID: Unit system UID.
    """
    if not ctx.certificate_path:
        ctx.certificate_path = '~/.aos/security/aos-user-oem.p12'

    show_unit_list(ctx.certificate_path, search=system_uid)


@cli.command()
@pass_obj
def units_last(ctx):
    """Shows the latest provisioned unit."""
    if not ctx.certificate_path:
        ctx.certificate_path = '~/.aos/security/aos-user-oem.p12'

    show_unit_list(ctx.certificate_path, status='provisioned', limit=1)


@cli.command()
@click.argument('system_uid')
@click.argument('label')
@pass_obj
def assign_unit(ctx: AosExampleSettings, system_uid, label):
    """
    Assigns a unit to a subject.

    SYSTEM_UID: Unit system UID.
    LABEL: Subject label.
    """
    if not ctx.certificate_path:
        ctx.certificate_path = '~/.aos/security/aos-user-oem.p12'

    assign_unit_to_subject(ctx.certificate_path, label, system_uid)


@cli.command()
@pass_obj
def unit_sets_list(ctx):
    """Shows list of unit sets."""
    if not ctx.certificate_path:
        ctx.certificate_path = '~/.aos/security/aos-user-oem.p12'

    show_unit_sets_list(ctx.certificate_path)


@cli.command()
@click.argument('title')
@click.option('--description', default='', help='Optional description for the unit set.')
@click.option('--no-verification', is_flag=True, default=False,
              help='Disable verification set flag (enabled by default).')
@click.option('--strategy', default='minimize_unit_restart',
              help='Update strategy (default: minimize_unit_restart).')
@click.option('--fleet-id', default='',
              help='Optional fleet UUID. If omitted, default fleet is used.')
@pass_obj
def unit_sets_create(ctx: AosExampleSettings, title, description, no_verification, strategy, fleet_id):
    """Creates a unit set.

    TITLE: Title for the new unit set.

    By default the unit set is created as a verification set with strategy
    'minimize_unit_restart', matching the Unitset_Bosch blueprint configuration.
    Use --no-verification to disable the verification set flag.
    """
    if not ctx.certificate_path:
        ctx.certificate_path = '~/.aos/security/aos-user-oem.p12'

    create_unit_set(
        ctx.certificate_path,
        title=title,
        description=description,
        is_verification_set=not no_verification,
        update_strategy=strategy,
        fleet_id=fleet_id,
    )


@cli.command()
@click.argument('system_uid')
@click.argument('title')
@pass_obj
def assign_unit_set(ctx: AosExampleSettings, system_uid, title):
    """Assigns a unit to a unit set.

    SYSTEM_UID: Unit system UID.
    TITLE: Unit set title.
    """
    if not ctx.certificate_path:
        ctx.certificate_path = '~/.aos/security/aos-user-oem.p12'

    assign_unit_to_unit_set(ctx.certificate_path, unit_set_title=title, unit_system_uid=system_uid)


@cli.command()
@click.option('--search', default='', help='Filter layers by name.')
@pass_obj
def layers_list(ctx, search):
    """Shows list of SOTA layers uploaded to AOS Cloud."""
    if not ctx.certificate_path:
        ctx.certificate_path = '~/.aos/security/aos-user-oem.p12'

    show_layers_list(ctx.certificate_path, search=search)


@cli.command()
@pass_obj
def verification_list(ctx):
    """Shows list of verification batches.

    Requires an SP certificate. Use --crt to provide aos-user-sp.p12.
    """
    if not ctx.certificate_path:
        ctx.certificate_path = '~/.aos/security/aos-user-sp.p12'

    show_verification_batches(ctx.certificate_path)


@cli.command()
@click.argument('batch_id')
@pass_obj
def verification_approve(ctx: AosExampleSettings, batch_id):
    """Approves a verification batch.

    BATCH_ID: ID of the verification batch to approve.

    Requires an SP certificate. Use --crt to provide aos-user-sp.p12.
    """
    if not ctx.certificate_path:
        ctx.certificate_path = '~/.aos/security/aos-user-sp.p12'

    approve_verification_batch(ctx.certificate_path, batch_id)


@cli.command()
@pass_obj
def bundles_list(ctx):
    """Shows list of deployment bundles.

    Requires an SP certificate. Use --crt to provide aos-user-sp.p12.
    """
    if not ctx.certificate_path:
        ctx.certificate_path = '~/.aos/security/aos-user-sp.p12'

    show_deployment_bundles(ctx.certificate_path)


@cli.command()
@click.argument('system_uid')
@pass_obj
def unit_config_show(ctx: AosExampleSettings, system_uid):
    """Shows target system unit configuration.

    SYSTEM_UID: Unit system UID.
    """
    if not ctx.certificate_path:
        ctx.certificate_path = '~/.aos/security/aos-user-oem.p12'

    show_target_unit_config(ctx.certificate_path, system_uid)


@cli.command()
@click.argument('system_uid')
@click.argument('out_file')
@pass_obj
def unit_config_export(ctx: AosExampleSettings, system_uid, out_file):
    """Exports target system unit configuration to JSON file.

    SYSTEM_UID: Unit system UID.
    OUT_FILE: Path to output JSON backup file.
    """
    if not ctx.certificate_path:
        ctx.certificate_path = '~/.aos/security/aos-user-oem.p12'

    export_target_unit_config(ctx.certificate_path, system_uid, out_file)


@cli.command()
@click.argument('system_uid')
@click.argument('config_file')
@click.option('--backup-file', default='', help='Optional path for pre-update backup JSON file.')
@click.option('--no-backup', is_flag=True, default=False,
              help='Skip automatic backup before updating unit config.')
@pass_obj
def unit_config_update(ctx: AosExampleSettings, system_uid, config_file, backup_file, no_backup):
    """Updates target system unit configuration from JSON file.

    SYSTEM_UID: Unit system UID.
    CONFIG_FILE: Path to JSON object with unit_config payload.

    By default, the current config is exported before patching. Use
    --backup-file to control destination, or --no-backup to skip.
    """
    if not ctx.certificate_path:
        ctx.certificate_path = '~/.aos/security/aos-user-oem.p12'

    update_target_unit_config(
        ctx.certificate_path,
        system_uid,
        config_file,
        backup_file=backup_file or None,
        no_backup=no_backup,
    )


@cli.command()
@click.argument('system_uid')
@click.option(
    '--template-url',
    default='https://raw.githubusercontent.com/aosedge/meta-aos-vm/demo_bosch/misc/unitconfig.json',
    help='Unit config template URL (default is aosedge/meta-aos-vm unitconfig.json).',
)
@click.option('--save-template-as', default='', help='Optional file path to save downloaded template JSON.')
@click.option('--backup-file', default='', help='Optional path for pre-update backup JSON file.')
@click.option('--no-backup', is_flag=True, default=False,
              help='Skip automatic backup before updating unit config.')
@pass_obj
def unit_config_apply_template(ctx: AosExampleSettings, system_uid, template_url, save_template_as, backup_file, no_backup):
    """Downloads unitconfig template and applies it to target system.

    SYSTEM_UID: Unit system UID.

    This automates: download unitconfig.json + import into UNIT CONFIG.
    """
    if not ctx.certificate_path:
        ctx.certificate_path = '~/.aos/security/aos-user-oem.p12'

    update_target_unit_config_from_url(
        ctx.certificate_path,
        system_uid,
        template_url=template_url,
        backup_file=backup_file or None,
        no_backup=no_backup,
        save_template_as=save_template_as or None,
    )


@cli.command()
@click.argument('codename')
@click.argument('system_uid')
@click.argument('label')
@pass_obj
def setup_subject(ctx: AosExampleSettings, codename, system_uid, label):
    """Sets up a subject end-to-end in one command.

    Creates the subject (if it doesn't exist), assigns the unit to it,
    then assigns the service — covering all three cloud-side steps from
    the blueprint "Bind the service with subject" workflow.

    CODENAME:   Service codename (e.g. ev-range-extender).
    SYSTEM_UID: Unit system UID.
    LABEL:      Subject label to create or reuse.
    """
    if not ctx.certificate_path:
        ctx.certificate_path = '~/.aos/security/aos-user-oem.p12'

    print(f"=== Step 1/2: Assign unit '{system_uid}' to subject '{label}' ===")
    assign_unit_to_subject(ctx.certificate_path, label, system_uid)

    print(f"\n=== Step 2/2: Assign service '{codename}' to subject '{label}' ===")
    assign_service_to_subject(ctx.certificate_path, label, codename)
if __name__ == '__main__':
    cli(obj=AosExampleSettings())

