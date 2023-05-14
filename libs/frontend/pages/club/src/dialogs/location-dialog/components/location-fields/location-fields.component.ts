import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime } from 'rxjs/operators';
import { Club, Location } from '@badman/frontend-models';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { MatInputModule } from '@angular/material/input';
import { MatDividerModule } from '@angular/material/divider';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { NgMapsPlacesModule } from '@ng-maps/places';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'badman-location-fields',
  templateUrl: './location-fields.component.html',
  styleUrls: ['./location-fields.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    // Core modules
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,

    // Other modules
    MatInputModule,
    MatDividerModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatIconModule,

    // My Modules
    NgMapsPlacesModule,
  ],
})
export class LocationDialogFieldsComponent implements OnInit {
  @Input()
  location: Location = {} as Location;

  @Input()
  club!: Club;

  @Output() whenLocationUpdate = new EventEmitter<Location>();

  placesConfig: google.maps.places.AutocompleteOptions = {
    componentRestrictions: {
      country: 'BE',
    },
    types: ['establishment'],
  };

  locationForm!: FormGroup;
  adressForm!: FormControl;

  ngOnInit() {
    const nameControl = new FormControl(
      this.location.name,
      Validators.required
    );

    const addressControl = new FormControl(this.location.address);
    const phoneControl = new FormControl(this.location.phone);
    const faxControl = new FormControl(this.location.fax);
    const cityControl = new FormControl(this.location.city);
    const postalcodeControl = new FormControl(this.location.postalcode);
    const stateControl = new FormControl(this.location.state);
    const streetControl = new FormControl(this.location.street);
    const streetNumberControl = new FormControl(this.location.streetNumber);

    this.locationForm = new FormGroup({
      address: addressControl,
      name: nameControl,
      phone: phoneControl,
      fax: faxControl,
      city: cityControl,
      postalcode: postalcodeControl,
      state: stateControl,
      street: streetControl,
      streetNumber: streetNumberControl,
    });
    this.locationForm.valueChanges.pipe(debounceTime(600)).subscribe((e) => {
      if (!this.location?.id) {
        if (this.locationForm.valid) {
          this.whenLocationUpdate.next({ id: this.location?.id, ...e });
        }
      } else {
        // always update if valid id
        this.whenLocationUpdate.next({ id: this.location?.id, ...e });
      }
    });
  }

  syncAutoComplete($event: google.maps.places.PlaceResult) {
    const city =
      $event.address_components?.find((r) => r.types.includes('sublocality'))
        ?.long_name ??
      $event.address_components?.find((r) => r.types.includes('locality'))
        ?.long_name;

    const postalcode = $event.address_components?.find((r) =>
      r.types.includes('postal_code')
    )?.long_name;
    const state = $event.address_components?.find((r) =>
      r.types.includes('administrative_area_level_2')
    )?.long_name;
    const street = $event.address_components?.find((r) =>
      r.types.includes('route')
    )?.long_name;
    const streetNumber = $event.address_components?.find((r) =>
      r.types.includes('street_number')
    )?.long_name;

    this.locationForm.patchValue({
      address: this.locationForm.value.address,
      name: $event.name,
      city: city,
      postalcode: postalcode,
      state: state,
      street: street,
      streetNumber: streetNumber,
    });
  }
}
